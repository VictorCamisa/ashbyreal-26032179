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
      console.log(`[Evolution API] Response preview: ${text.substring(0, 300)}`);
      
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
          .map(c => c.telefone?.replace(/\D/g, ''))
          .filter(Boolean)
      );
    };

    const normalizePhone = (jid: string): string => {
      // Remove @s.whatsapp.net, @g.us, @lid, etc
      let phone = jid.split('@')[0];
      // Remove any non-digit characters
      phone = phone.replace(/\D/g, '');
      return phone;
    };

    const formatPhoneDisplay = (phone: string): string => {
      // Format Brazilian phone: +55 (11) 99999-9999
      if (phone.length === 13 && phone.startsWith('55')) {
        const ddd = phone.slice(2, 4);
        const part1 = phone.slice(4, 9);
        const part2 = phone.slice(9);
        return `+55 (${ddd}) ${part1}-${part2}`;
      }
      if (phone.length === 12 && phone.startsWith('55')) {
        const ddd = phone.slice(2, 4);
        const part1 = phone.slice(4, 8);
        const part2 = phone.slice(8);
        return `+55 (${ddd}) ${part1}-${part2}`;
      }
      return phone;
    };

    switch (action) {
      case "fetch-chats": {
        if (!instanceName) {
          throw new Error("instanceName is required");
        }

        const existingPhones = await getExistingPhones();
        
        // Fetch all chats
        const chats = await evolutionFetch(`/chat/findChats/${instanceName}`, {
          method: "POST",
          body: JSON.stringify({}),
        });

        console.log(`[extract-leads] Found ${chats?.length || 0} chats`);

        const leads: ExtractedLead[] = [];
        
        for (const chat of (chats || [])) {
          const jid = chat.id || chat.remoteJid;
          if (!jid) continue;
          
          // Skip groups and status broadcasts
          if (jid.includes('@g.us') || jid.includes('@broadcast') || jid === 'status@broadcast') {
            continue;
          }

          const phone = normalizePhone(jid);
          if (!phone || phone.length < 10) continue;

          const isExisting = existingPhones.has(phone);

          leads.push({
            id: jid,
            name: chat.pushName || chat.name || formatPhoneDisplay(phone),
            phone: formatPhoneDisplay(phone),
            source: 'chat',
            lastInteraction: chat.lastMsgTimestamp ? new Date(chat.lastMsgTimestamp * 1000).toISOString() : undefined,
            profilePicUrl: chat.profilePictureUrl,
            isExistingClient: isExisting,
          });
        }

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
            }
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "fetch-groups": {
        if (!instanceName) {
          throw new Error("instanceName is required");
        }

        // Fetch all groups
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

        // Fetch group participants
        const group = await evolutionFetch(`/group/participants/${instanceName}?groupJid=${encodeURIComponent(groupId)}`, {
          method: "GET",
        });

        console.log(`[extract-leads] Fetched group details for ${groupId}`);

        const participants = group?.participants || group || [];
        const leads: ExtractedLead[] = [];

        for (const participant of participants) {
          const jid = participant.id || participant;
          if (!jid || typeof jid !== 'string') continue;
          
          // Skip non-user JIDs
          if (!jid.includes('@s.whatsapp.net')) continue;

          const phone = normalizePhone(jid);
          if (!phone || phone.length < 10) continue;

          const isExisting = existingPhones.has(phone);

          leads.push({
            id: jid,
            name: participant.name || participant.pushName || formatPhoneDisplay(phone),
            phone: formatPhoneDisplay(phone),
            source: 'group',
            groupName: group.subject || undefined,
            isExistingClient: isExisting,
          });
        }

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
            groupName: group.subject || 'Grupo',
            stats: {
              total: leads.length,
              new: leads.filter(l => !l.isExistingClient).length,
              existing: leads.filter(l => l.isExistingClient).length,
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

        // Fetch all contacts
        const contacts = await evolutionFetch(`/chat/findContacts/${instanceName}`, {
          method: "POST",
          body: JSON.stringify({}),
        });

        console.log(`[extract-leads] Found ${contacts?.length || 0} contacts`);

        const leads: ExtractedLead[] = [];

        for (const contact of (contacts || [])) {
          const jid = contact.id || contact.remoteJid;
          if (!jid) continue;
          
          // Skip groups and broadcasts
          if (jid.includes('@g.us') || jid.includes('@broadcast')) continue;

          const phone = normalizePhone(jid);
          if (!phone || phone.length < 10) continue;

          const isExisting = existingPhones.has(phone);

          leads.push({
            id: jid,
            name: contact.pushName || contact.name || contact.verifiedName || formatPhoneDisplay(phone),
            phone: formatPhoneDisplay(phone),
            source: 'contact',
            profilePicUrl: contact.profilePictureUrl,
            isExistingClient: isExisting,
          });
        }

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
            
            // Skip if already exists
            if (existingPhones.has(phoneClean)) {
              skipped.push(lead.phone);
              continue;
            }

            // Create client
            const { error } = await supabase
              .from("clientes")
              .insert({
                nome: lead.name || 'Lead WhatsApp',
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
              existingPhones.add(phoneClean); // Prevent duplicates in same batch
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
