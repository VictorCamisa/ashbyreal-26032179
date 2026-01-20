import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ExtractedLead {
  id: string;
  name: string;
  phone: string;
  source: 'chat' | 'group' | 'contact';
  groupName?: string;
  lastInteraction?: string;
  profilePicUrl?: string;
  isExistingClient?: boolean;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);
    
    const body = await req.json();
    const { action, instanceName, evolutionApiUrl, evolutionApiKey, groupId, leads } = body;

    console.log(`[extract-leads] Action: ${action}, Instance: ${instanceName}`);

    const EVOLUTION_API_URL = evolutionApiUrl || Deno.env.get("EVOLUTION_API_URL");
    const EVOLUTION_API_KEY = evolutionApiKey || Deno.env.get("EVOLUTION_API_KEY");

    if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY) {
      throw new Error("Evolution API credentials not provided");
    }

    const evolutionFetch = async (endpoint: string, options: RequestInit = {}) => {
      const baseUrl = EVOLUTION_API_URL.replace(/\/+$/, '');
      const cleanEndpoint = endpoint.replace(/^\/+/, '');
      const url = `${baseUrl}/${cleanEndpoint}`;
      console.log(`[Evolution API] ${options.method || 'GET'} ${url}`);
      
      const response = await fetch(url, {
        ...options,
        headers: {
          "apikey": EVOLUTION_API_KEY,
          "Content-Type": "application/json",
          ...options.headers,
        },
      });
      
      const text = await response.text();
      console.log(`[Evolution API] Response status: ${response.status}`);
      console.log(`[Evolution API] Response preview: ${text.substring(0, 500)}`);
      
      if (!response.ok) {
        throw new Error(`Evolution API error: ${response.status} - ${text}`);
      }
      
      return text ? JSON.parse(text) : null;
    };

    // Resolve a single LID to real phone by querying the contact specifically
    const resolveLidToPhone = async (lidJid: string, contactData: any): Promise<{ phone: string | null; name: string | null }> => {
      // First check if we already have pnJid in the contact data
      if (contactData.pnJid && contactData.pnJid.includes('@s.whatsapp.net')) {
        return {
          phone: contactData.pnJid.split('@')[0],
          name: contactData.pushName || contactData.name || contactData.verifiedName || null
        };
      }
      
      // Check remoteJidAlt
      if (contactData.remoteJidAlt && contactData.remoteJidAlt.includes('@s.whatsapp.net')) {
        return {
          phone: contactData.remoteJidAlt.split('@')[0],
          name: contactData.pushName || contactData.name || contactData.verifiedName || null
        };
      }

      // Try to query specific contact by ID to get pnJid
      try {
        const normalizedLid = lidJid.replace(/:\d+(?=@lid)/g, '');
        const response = await evolutionFetch(`/chat/findContacts/${instanceName}`, {
          method: "POST",
          body: JSON.stringify({ where: { id: normalizedLid } }),
        });

        if (response && Array.isArray(response)) {
          for (const contact of response) {
            if (contact.pnJid && contact.pnJid.includes('@s.whatsapp.net')) {
              return {
                phone: contact.pnJid.split('@')[0],
                name: contact.pushName || contact.name || contact.verifiedName || null
              };
            }
          }
        }
      } catch (e) {
        console.log(`[extract-leads] Failed to resolve LID ${lidJid}:`, e);
      }
      
      return { phone: null, name: null };
    };

    // Get existing clients' phones for deduplication
    const getExistingPhones = async () => {
      const { data: existingClients } = await supabase
        .from("clientes")
        .select("telefone");
      
      return new Set(
        (existingClients || [])
          .map(c => {
            const phone = c.telefone?.replace(/\D/g, '');
            // Normalize: remove country code for comparison
            if (phone?.startsWith('55') && phone.length >= 12) {
              return phone.slice(2); // Remove 55
            }
            return phone;
          })
          .filter(Boolean)
      );
    };

    // Extract JID - now accepts both @lid and @s.whatsapp.net
    const extractJid = (item: any): { jid: string | null; isLid: boolean } => {
      // Priority 1: Check for pnJid (phone number JID)
      if (item.pnJid && item.pnJid.includes('@s.whatsapp.net')) {
        return { jid: item.pnJid, isLid: false };
      }
      
      // Priority 2: Check remoteJidAlt
      if (item.remoteJidAlt && item.remoteJidAlt.includes('@s.whatsapp.net')) {
        return { jid: item.remoteJidAlt, isLid: false };
      }
      
      // Priority 3: Check key.remoteJidAlt
      if (item.key?.remoteJidAlt && item.key.remoteJidAlt.includes('@s.whatsapp.net')) {
        return { jid: item.key.remoteJidAlt, isLid: false };
      }
      
      // Priority 4: Regular JID fields
      const jid = item.id || item.remoteJid || item.jid || item.key?.remoteJid;
      
      if (jid && jid.includes('@s.whatsapp.net')) {
        return { jid, isLid: false };
      }
      
      // Priority 5: Accept @lid JIDs (we'll try to resolve them)
      if (jid && jid.includes('@lid')) {
        return { jid, isLid: true };
      }
      
      return { jid: null, isLid: false };
    };

    const normalizePhone = (jid: string): string => {
      if (!jid || typeof jid !== 'string') return '';
      
      // Remove @s.whatsapp.net and other suffixes
      let phone = jid.split('@')[0];
      
      // Handle any colon format
      if (phone.includes(':')) {
        phone = phone.split(':')[0];
      }
      
      // Remove any non-digit characters
      phone = phone.replace(/\D/g, '');
      
      // Skip invalid phones (less than 10 digits)
      if (phone.length < 10) return '';
      
      // Add Brazil country code if missing
      if (phone.length === 10 || phone.length === 11) {
        phone = '55' + phone;
      }
      
      return phone;
    };

    const formatPhoneDisplay = (phone: string): string => {
      if (!phone) return '';
      
      const cleanPhone = phone.replace(/\D/g, '');
      
      // Brazilian format: 55 + DDD(2) + 9-digit mobile (total 13)
      if (cleanPhone.length === 13 && cleanPhone.startsWith('55')) {
        const ddd = cleanPhone.slice(2, 4);
        const number = cleanPhone.slice(4);
        return `+55 (${ddd}) ${number.slice(0, 5)}-${number.slice(5)}`;
      }
      
      // Brazilian format: 55 + DDD(2) + 8-digit (total 12)
      if (cleanPhone.length === 12 && cleanPhone.startsWith('55')) {
        const ddd = cleanPhone.slice(2, 4);
        const number = cleanPhone.slice(4);
        return `+55 (${ddd}) ${number.slice(0, 4)}-${number.slice(4)}`;
      }
      
      // 11 digits - Brazilian without country code (DDD + 9 digits)
      if (cleanPhone.length === 11) {
        const ddd = cleanPhone.slice(0, 2);
        const number = cleanPhone.slice(2);
        return `+55 (${ddd}) ${number.slice(0, 5)}-${number.slice(5)}`;
      }
      
      // 10 digits - Brazilian without country code (DDD + 8 digits)
      if (cleanPhone.length === 10) {
        const ddd = cleanPhone.slice(0, 2);
        const number = cleanPhone.slice(2);
        return `+55 (${ddd}) ${number.slice(0, 4)}-${number.slice(4)}`;
      }
      
      // International or other format
      if (cleanPhone.length > 10) {
        return `+${cleanPhone}`;
      }
      
      return cleanPhone;
    };

    const extractName = (item: any): string => {
      const possibleNames = [
        item.pushName,
        item.name,
        item.verifiedName,
        item.notify,
        item.displayName,
        item.formattedName,
        item.subject,
      ];
      
      for (const name of possibleNames) {
        if (name && typeof name === 'string' && name.trim().length > 0) {
          return name.trim();
        }
      }
      
      return '';
    };

    // Process contacts/chats and resolve LIDs in batch
    const processContacts = async (
      items: any[], 
      source: 'chat' | 'contact' | 'group',
      existingPhones: Set<string>,
      groupName?: string
    ): Promise<{ leads: ExtractedLead[]; stats: { total: number; resolved: number; unresolved: number } }> => {
      const leads: ExtractedLead[] = [];
      const lidsToResolve: Array<{ item: any; lid: string }> = [];
      let resolved = 0;
      let unresolved = 0;

      // First pass: separate resolved contacts from LIDs
      for (const item of items) {
        // Skip groups and broadcasts
        const rawJid = item.id || item.remoteJid || item.jid;
        if (rawJid?.includes('@g.us') || rawJid?.includes('@broadcast') || item.isGroup) {
          continue;
        }

        const { jid, isLid } = extractJid(item);
        
        if (!jid) continue;

        if (!isLid) {
          // Already have real phone
          const phone = normalizePhone(jid);
          if (!phone) continue;

          const phoneWithoutCountry = phone.startsWith('55') && phone.length >= 12 
            ? phone.slice(2) 
            : phone;
          const isExisting = existingPhones.has(phoneWithoutCountry) || existingPhones.has(phone);
          
          const name = extractName(item);
          const formattedPhone = formatPhoneDisplay(phone);

          leads.push({
            id: jid,
            name: name || formattedPhone,
            phone: formattedPhone,
            source,
            groupName,
            lastInteraction: item.lastMsgTimestamp 
              ? new Date(typeof item.lastMsgTimestamp === 'number' && item.lastMsgTimestamp < 10000000000 
                  ? item.lastMsgTimestamp * 1000 
                  : item.lastMsgTimestamp).toISOString() 
              : undefined,
            profilePicUrl: item.profilePictureUrl || item.profilePicUrl,
            isExistingClient: isExisting,
          });
          resolved++;
        } else {
          // Need to resolve LID
          lidsToResolve.push({ item, lid: jid });
        }
      }

      console.log(`[extract-leads] Direct resolved: ${resolved}, LIDs to resolve: ${lidsToResolve.length}`);

      // Second pass: resolve LIDs (limit to first 100 to avoid timeout)
      const lidsToProcess = lidsToResolve.slice(0, 100);
      
      for (const { item, lid } of lidsToProcess) {
        const { phone: resolvedPhone, name: resolvedName } = await resolveLidToPhone(lid, item);
        
        if (resolvedPhone) {
          const phone = normalizePhone(resolvedPhone);
          if (!phone) {
            unresolved++;
            continue;
          }

          const phoneWithoutCountry = phone.startsWith('55') && phone.length >= 12 
            ? phone.slice(2) 
            : phone;
          const isExisting = existingPhones.has(phoneWithoutCountry) || existingPhones.has(phone);
          
          const name = resolvedName || extractName(item);
          const formattedPhone = formatPhoneDisplay(phone);

          leads.push({
            id: `${resolvedPhone}@s.whatsapp.net`,
            name: name || formattedPhone,
            phone: formattedPhone,
            source,
            groupName,
            lastInteraction: item.lastMsgTimestamp 
              ? new Date(typeof item.lastMsgTimestamp === 'number' && item.lastMsgTimestamp < 10000000000 
                  ? item.lastMsgTimestamp * 1000 
                  : item.lastMsgTimestamp).toISOString() 
              : undefined,
            profilePicUrl: item.profilePictureUrl || item.profilePicUrl,
            isExistingClient: isExisting,
          });
          resolved++;
        } else {
          unresolved++;
        }
      }

      // Count remaining unprocessed LIDs
      unresolved += lidsToResolve.length - lidsToProcess.length;

      return {
        leads,
        stats: { total: items.length, resolved, unresolved }
      };
    };

    switch (action) {
      case "fetch-chats": {
        if (!instanceName) {
          throw new Error("instanceName is required");
        }

        const existingPhones = await getExistingPhones();
        
        const chats = await evolutionFetch(`/chat/findChats/${instanceName}`, {
          method: "POST",
          body: JSON.stringify({}),
        });

        console.log(`[extract-leads] Found ${chats?.length || 0} chats`);
        
        if (chats && chats.length > 0) {
          console.log(`[extract-leads] Sample chats:`, JSON.stringify(chats.slice(0, 3)).substring(0, 1000));
        }

        const { leads, stats } = await processContacts(chats || [], 'chat', existingPhones);

        console.log(`[extract-leads] Chat stats:`, stats);

        // Sort: new leads first, then by last interaction
        leads.sort((a, b) => {
          if (a.isExistingClient !== b.isExistingClient) {
            return a.isExistingClient ? 1 : -1;
          }
          if (a.lastInteraction && b.lastInteraction) {
            return new Date(b.lastInteraction).getTime() - new Date(a.lastInteraction).getTime();
          }
          return 0;
        });

        return new Response(
          JSON.stringify({ 
            success: true, 
            leads,
            stats: {
              total: leads.length,
              new: leads.filter(l => !l.isExistingClient).length,
              existing: leads.filter(l => l.isExistingClient).length,
              unresolved: stats.unresolved,
            }
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "fetch-groups": {
        if (!instanceName) {
          throw new Error("instanceName is required");
        }

        const groups = await evolutionFetch(`/group/fetchAllGroups/${instanceName}?getParticipants=false`, {
          method: "GET",
        });

        console.log(`[extract-leads] Found ${groups?.length || 0} groups`);

        const groupList = (groups || []).map((group: any) => ({
          id: group.id,
          name: group.subject || group.name || 'Grupo sem nome',
          participantsCount: group.size || group.participants?.length || 0,
          description: group.desc || '',
          pictureUrl: group.pictureUrl,
          creation: group.creation ? new Date(group.creation * 1000).toISOString() : undefined,
        }));

        return new Response(
          JSON.stringify({ success: true, groups: groupList }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "fetch-group-members": {
        if (!instanceName || !groupId) {
          throw new Error("instanceName and groupId are required");
        }

        const existingPhones = await getExistingPhones();

        const group = await evolutionFetch(`/group/participants/${instanceName}?groupJid=${encodeURIComponent(groupId)}`, {
          method: "GET",
        });

        console.log(`[extract-leads] Fetched group details for ${groupId}`);
        console.log(`[extract-leads] Group response:`, JSON.stringify(group).substring(0, 500));

        const participants = group?.participants || group || [];
        const groupName = group?.subject || group?.name || 'Grupo';
        
        // Convert string participants to objects
        const normalizedParticipants = participants.map((p: any) => {
          if (typeof p === 'string') {
            return { id: p, remoteJid: p };
          }
          return p;
        });

        const { leads, stats } = await processContacts(normalizedParticipants, 'group', existingPhones, groupName);

        console.log(`[extract-leads] Group member stats:`, stats);

        // Sort: new leads first
        leads.sort((a, b) => {
          if (a.isExistingClient !== b.isExistingClient) {
            return a.isExistingClient ? 1 : -1;
          }
          return a.name.localeCompare(b.name);
        });

        return new Response(
          JSON.stringify({ 
            success: true, 
            leads,
            groupName: groupName,
            stats: {
              total: leads.length,
              new: leads.filter(l => !l.isExistingClient).length,
              existing: leads.filter(l => l.isExistingClient).length,
              unresolved: stats.unresolved,
            }
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "fetch-contacts": {
        if (!instanceName) {
          throw new Error("instanceName is required");
        }

        const existingPhones = await getExistingPhones();

        const contacts = await evolutionFetch(`/chat/findContacts/${instanceName}`, {
          method: "POST",
          body: JSON.stringify({}),
        });

        console.log(`[extract-leads] Found ${contacts?.length || 0} contacts`);
        
        if (contacts && contacts.length > 0) {
          console.log(`[extract-leads] Sample contacts:`, JSON.stringify(contacts.slice(0, 3)).substring(0, 1000));
        }

        const { leads, stats } = await processContacts(contacts || [], 'contact', existingPhones);

        console.log(`[extract-leads] Contact stats:`, stats);

        // Sort: new leads first, then alphabetically
        leads.sort((a, b) => {
          if (a.isExistingClient !== b.isExistingClient) {
            return a.isExistingClient ? 1 : -1;
          }
          return a.name.localeCompare(b.name);
        });

        return new Response(
          JSON.stringify({ 
            success: true, 
            leads,
            stats: {
              total: leads.length,
              new: leads.filter(l => !l.isExistingClient).length,
              existing: leads.filter(l => l.isExistingClient).length,
              unresolved: stats.unresolved,
            }
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "import-leads": {
        if (!leads || !Array.isArray(leads) || leads.length === 0) {
          throw new Error("leads array is required");
        }

        console.log(`[extract-leads] Importing ${leads.length} leads`);

        const existingPhones = await getExistingPhones();
        const imported: string[] = [];
        const skipped: string[] = [];
        const errors: string[] = [];

        for (const lead of leads) {
          try {
            const phoneClean = lead.phone?.replace(/\D/g, '') || '';
            
            if (!phoneClean) {
              errors.push(`${lead.name}: telefone inválido`);
              continue;
            }

            // Check if already exists
            const phoneWithoutCountry = phoneClean.startsWith('55') && phoneClean.length >= 12 
              ? phoneClean.slice(2) 
              : phoneClean;
              
            if (existingPhones.has(phoneWithoutCountry) || existingPhones.has(phoneClean)) {
              skipped.push(lead.name || lead.phone);
              continue;
            }

            // Choose best name
            let clientName = lead.name || '';
            if (!clientName || clientName === lead.phone || clientName.match(/^\+?\d[\d\s()-]+$/)) {
              clientName = `Lead WhatsApp`;
            }

            const { error } = await supabase
              .from("clientes")
              .insert({
                nome: clientName,
                telefone: lead.phone,
                email: `${phoneClean}@lead.whatsapp`,
                origem: "WhatsApp",
                status: "lead",
                observacoes: lead.groupName 
                  ? `Importado do grupo: ${lead.groupName}` 
                  : `Importado do WhatsApp (${lead.source})`,
                ultimo_contato: lead.lastInteraction || new Date().toISOString(),
              });

            if (error) {
              if (error.code === '23505') {
                skipped.push(lead.name || lead.phone);
              } else {
                errors.push(`${lead.name}: ${error.message}`);
              }
            } else {
              imported.push(lead.name || lead.phone);
              // Add to existing set to prevent duplicates in same batch
              existingPhones.add(phoneWithoutCountry);
            }
          } catch (e) {
            errors.push(`${lead.name}: ${e instanceof Error ? e.message : 'Erro desconhecido'}`);
          }
        }

        console.log(`[extract-leads] Import complete: ${imported.length} imported, ${skipped.length} skipped, ${errors.length} errors`);

        return new Response(
          JSON.stringify({ 
            success: true, 
            imported: imported.length,
            skipped: skipped.length,
            errors: errors.length,
            details: {
              imported,
              skipped,
              errors,
            }
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }

  } catch (error) {
    console.error("[extract-leads] Error:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : "Unknown error" 
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
