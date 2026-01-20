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

    // Extract real phone from JID - handles @lid, @s.whatsapp.net formats
    // Also checks remoteJidAlt and pnJid fields for LID resolution
    const extractRealJid = (item: any): string | null => {
      // Priority 1: Check for pnJid (phone number JID) - used for LID resolution
      if (item.pnJid && item.pnJid.includes('@s.whatsapp.net')) {
        return item.pnJid;
      }
      
      // Priority 2: Check remoteJidAlt
      if (item.remoteJidAlt && item.remoteJidAlt.includes('@s.whatsapp.net')) {
        return item.remoteJidAlt;
      }
      
      // Priority 3: Check key.remoteJidAlt (nested structure)
      if (item.key?.remoteJidAlt && item.key.remoteJidAlt.includes('@s.whatsapp.net')) {
        return item.key.remoteJidAlt;
      }
      
      // Priority 4: Regular JID fields
      const jid = item.id || item.remoteJid || item.jid || item.key?.remoteJid;
      if (jid && jid.includes('@s.whatsapp.net')) {
        return jid;
      }
      
      // Skip @lid, @g.us, @broadcast
      return null;
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
      
      // Skip invalid phones
      if (phone.length < 10) return '';
      
      return phone;
    };

    const formatPhoneDisplay = (phone: string): string => {
      if (!phone) return '';
      
      const cleanPhone = phone.replace(/\D/g, '');
      
      // Brazilian format: 55 + DDD(2) + 9-digit mobile (total 13)
      if (cleanPhone.length === 13 && cleanPhone.startsWith('55')) {
        const ddd = cleanPhone.slice(2, 4);
        const number = cleanPhone.slice(4);
        // 9-digit mobile: 9XXXX-XXXX
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
        
        // Log first few chats for debugging
        if (chats && chats.length > 0) {
          console.log(`[extract-leads] Sample chats:`, JSON.stringify(chats.slice(0, 3)).substring(0, 1000));
        }

        const leads: ExtractedLead[] = [];
        let skippedLid = 0;
        
        for (const chat of (chats || [])) {
          // Get real JID (resolves LID if possible)
          const realJid = extractRealJid(chat);
          
          if (!realJid) {
            // Check if it's a LID we couldn't resolve
            const rawJid = chat.id || chat.remoteJid || chat.jid;
            if (rawJid?.includes('@lid')) {
              skippedLid++;
            }
            continue;
          }
          
          // Skip groups and broadcasts
          if (realJid.includes('@g.us') || realJid.includes('@broadcast')) {
            continue;
          }

          const phone = normalizePhone(realJid);
          if (!phone) continue;

          // Check if existing (compare without country code)
          const phoneWithoutCountry = phone.startsWith('55') && phone.length >= 12 
            ? phone.slice(2) 
            : phone;
          const isExisting = existingPhones.has(phoneWithoutCountry) || existingPhones.has(phone);
          
          const name = extractName(chat);
          const formattedPhone = formatPhoneDisplay(phone);

          leads.push({
            id: realJid,
            name: name || formattedPhone,
            phone: formattedPhone,
            source: 'chat',
            lastInteraction: chat.lastMsgTimestamp 
              ? new Date(typeof chat.lastMsgTimestamp === 'number' && chat.lastMsgTimestamp < 10000000000 
                  ? chat.lastMsgTimestamp * 1000 
                  : chat.lastMsgTimestamp).toISOString() 
              : undefined,
            profilePicUrl: chat.profilePictureUrl || chat.profilePicUrl,
            isExistingClient: isExisting,
          });
        }

        console.log(`[extract-leads] Processed ${leads.length} chat leads, skipped ${skippedLid} LID contacts`);

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
              skippedLid,
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
        const leads: ExtractedLead[] = [];
        let skippedLid = 0;

        for (const participant of participants) {
          // Handle both object format and string format
          let realJid: string | null = null;
          
          if (typeof participant === 'object') {
            realJid = extractRealJid(participant);
          } else if (typeof participant === 'string' && participant.includes('@s.whatsapp.net')) {
            realJid = participant;
          }
          
          if (!realJid) {
            const rawJid = typeof participant === 'object' 
              ? (participant.id || participant.jid) 
              : participant;
            if (rawJid?.includes('@lid')) {
              skippedLid++;
            }
            continue;
          }

          const phone = normalizePhone(realJid);
          if (!phone) continue;

          const phoneWithoutCountry = phone.startsWith('55') && phone.length >= 12 
            ? phone.slice(2) 
            : phone;
          const isExisting = existingPhones.has(phoneWithoutCountry) || existingPhones.has(phone);
          
          const name = typeof participant === 'object' ? extractName(participant) : '';
          const formattedPhone = formatPhoneDisplay(phone);

          leads.push({
            id: realJid,
            name: name || formattedPhone,
            phone: formattedPhone,
            source: 'group',
            groupName: groupName,
            isExistingClient: isExisting,
          });
        }

        console.log(`[extract-leads] Processed ${leads.length} group members, skipped ${skippedLid} LID`);

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
              skippedLid,
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

        const leads: ExtractedLead[] = [];
        let skippedLid = 0;

        for (const contact of (contacts || [])) {
          const realJid = extractRealJid(contact);
          
          if (!realJid) {
            const rawJid = contact.id || contact.remoteJid || contact.jid;
            if (rawJid?.includes('@lid')) {
              skippedLid++;
            }
            continue;
          }
          
          // Skip groups and broadcasts
          if (realJid.includes('@g.us') || realJid.includes('@broadcast')) continue;

          const phone = normalizePhone(realJid);
          if (!phone) continue;

          const phoneWithoutCountry = phone.startsWith('55') && phone.length >= 12 
            ? phone.slice(2) 
            : phone;
          const isExisting = existingPhones.has(phoneWithoutCountry) || existingPhones.has(phone);
          
          const name = extractName(contact);
          const formattedPhone = formatPhoneDisplay(phone);

          leads.push({
            id: realJid,
            name: name || formattedPhone,
            phone: formattedPhone,
            source: 'contact',
            profilePicUrl: contact.profilePictureUrl || contact.profilePicUrl,
            isExistingClient: isExisting,
          });
        }

        console.log(`[extract-leads] Processed ${leads.length} contacts, skipped ${skippedLid} LID`);

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
              skippedLid,
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
            const phoneClean = lead.phone.replace(/\D/g, '');
            
            // Normalize for comparison
            const phoneWithoutCountry = phoneClean.startsWith('55') && phoneClean.length >= 12 
              ? phoneClean.slice(2) 
              : phoneClean;
            
            // Skip if already exists
            if (existingPhones.has(phoneWithoutCountry) || existingPhones.has(phoneClean)) {
              skipped.push(lead.phone);
              continue;
            }

            // Determine best name (avoid using phone as name)
            const isPhoneAsName = !lead.name || 
              lead.name.match(/^\+?\d[\d\s\-\(\)]+$/) || 
              lead.name === lead.phone;
            
            const clientName = isPhoneAsName ? 'Lead WhatsApp' : lead.name;

            // Create client
            const { error } = await supabase
              .from("clientes")
              .insert({
                nome: clientName,
                telefone: lead.phone,
                email: `${phoneClean}@whatsapp.lead`,
                origem: 'WhatsApp',
                status: 'lead',
                observacoes: lead.groupName 
                  ? `Extraído do grupo: ${lead.groupName}` 
                  : `Extraído do WhatsApp (${lead.source})`,
              });

            if (error) {
              console.error(`[extract-leads] Error importing ${lead.phone}:`, error);
              errors.push(lead.phone);
            } else {
              imported.push(lead.phone);
              existingPhones.add(phoneWithoutCountry);
            }
          } catch (e) {
            console.error(`[extract-leads] Exception importing ${lead.phone}:`, e);
            errors.push(lead.phone);
          }
        }

        return new Response(
          JSON.stringify({ 
            success: true, 
            imported: imported.length,
            skipped: skipped.length,
            errors: errors.length,
            details: { imported, skipped, errors }
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
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});