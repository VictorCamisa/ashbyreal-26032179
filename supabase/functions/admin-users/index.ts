import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    
    // Get the authorization header to verify the requesting user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create client with user's token to verify they're admin
    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !user) {
      console.error("Auth error:", userError);
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if user is admin using service role client
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    
    const { data: roleData, error: roleError } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .single();

    if (roleError || !roleData) {
      console.error("Role check error:", roleError);
      return new Response(JSON.stringify({ error: "Não autorizado. Apenas administradores podem acessar." }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const url = new URL(req.url);
    const action = url.searchParams.get("action");
    
    console.log(`Processing action: ${action}, method: ${req.method}`);

    // LIST USERS
    if (req.method === "GET" && action === "list") {
      console.log("Listing users...");
      
      const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers();
      if (listError) {
        console.error("List users error:", listError);
        throw listError;
      }

      // Get profiles, roles and module permissions
      const { data: profiles } = await supabaseAdmin.from("profiles").select("*");
      const { data: roles } = await supabaseAdmin.from("user_roles").select("*");
      const { data: modulePermissions } = await supabaseAdmin.from("user_module_permissions").select("*");

      const usersWithDetails = users.map((u) => {
        const profile = profiles?.find((p) => p.id === u.id);
        const userRoles = roles?.filter((r) => r.user_id === u.id).map((r) => r.role) || [];
        const userModules = modulePermissions?.filter((m) => m.user_id === u.id) || [];
        const visibleModules = userModules.filter((m) => m.is_visible).map((m) => m.module_key);
        return {
          id: u.id,
          email: u.email,
          nome: profile?.nome || u.email,
          cargo: profile?.cargo,
          telefone: profile?.telefone,
          avatar_url: profile?.avatar_url,
          is_owner: profile?.is_owner || false,
          roles: userRoles,
          modules: visibleModules,
          created_at: u.created_at,
          email_confirmed_at: u.email_confirmed_at,
        };
      });

      return new Response(JSON.stringify({ users: usersWithDetails }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // CREATE USER
    if (req.method === "POST" && action === "create") {
      const { email, password, nome, telefone, cargo, role, is_owner, modules } = await req.json();
      console.log("Creating user:", email, "with modules:", modules);

      if (!email || !password || !telefone) {
        return new Response(JSON.stringify({ error: "Email, senha e WhatsApp são obrigatórios" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Create user with email confirmed (no email validation)
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true, // Skip email confirmation
        user_metadata: { nome },
      });

      if (createError) {
        console.error("Create user error:", createError);
        return new Response(JSON.stringify({ error: createError.message }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Update profile with telefone, cargo and is_owner
      if (newUser.user) {
        await supabaseAdmin
          .from("profiles")
          .update({ 
            telefone: telefone || null,
            cargo: cargo || null,
            is_owner: is_owner || false
          })
          .eq("id", newUser.user.id);
      }

      // Add role if provided
      if (role && newUser.user) {
        await supabaseAdmin
          .from("user_roles")
          .insert({ user_id: newUser.user.id, role });
      }

      // Add module permissions if provided
      if (modules && Array.isArray(modules) && newUser.user) {
        const moduleRecords = modules.map((moduleKey: string) => ({
          user_id: newUser.user!.id,
          module_key: moduleKey,
          is_visible: true,
        }));
        
        if (moduleRecords.length > 0) {
          await supabaseAdmin.from("user_module_permissions").insert(moduleRecords);
        }
      }

      console.log("User created successfully:", newUser.user?.id);
      return new Response(JSON.stringify({ user: newUser.user }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // DELETE USER
    if (req.method === "POST" && action === "delete") {
      const { userId } = await req.json();
      console.log("Deleting user:", userId);

      if (!userId) {
        return new Response(JSON.stringify({ error: "userId é obrigatório" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Prevent self-deletion
      if (userId === user.id) {
        return new Response(JSON.stringify({ error: "Você não pode excluir a si mesmo" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);
      if (deleteError) {
        console.error("Delete user error:", deleteError);
        throw deleteError;
      }

      console.log("User deleted successfully");
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // UPDATE ROLE
    if (req.method === "PUT" && action === "role") {
      const { userId, role, remove } = await req.json();
      console.log("Updating role:", userId, role, remove);

      if (!userId || !role) {
        return new Response(JSON.stringify({ error: "userId e role são obrigatórios" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (remove) {
        // Prevent removing own admin role
        if (userId === user.id && role === "admin") {
          return new Response(JSON.stringify({ error: "Você não pode remover seu próprio papel de admin" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const { error } = await supabaseAdmin
          .from("user_roles")
          .delete()
          .eq("user_id", userId)
          .eq("role", role);

        if (error) {
          console.error("Error removing role:", error);
          throw error;
        }
      } else {
        const { error } = await supabaseAdmin
          .from("user_roles")
          .upsert({ user_id: userId, role }, { onConflict: "user_id,role" });

        if (error) {
          console.error("Error adding role:", error);
          throw error;
        }
      }

      console.log("Role updated successfully");
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // UPDATE PROFILE
    if (req.method === "POST" && action === "update") {
      const { userId, nome, telefone, cargo, is_owner, modules } = await req.json();
      console.log("Updating profile:", userId, "with modules:", modules);

      if (!userId) {
        return new Response(JSON.stringify({ error: "userId é obrigatório" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const updateData: Record<string, unknown> = {};
      if (nome !== undefined) updateData.nome = nome;
      if (telefone !== undefined) updateData.telefone = telefone;
      if (cargo !== undefined) updateData.cargo = cargo;
      if (is_owner !== undefined) updateData.is_owner = is_owner;

      const { error: updateError } = await supabaseAdmin
        .from("profiles")
        .update(updateData)
        .eq("id", userId);

      if (updateError) {
        console.error("Update profile error:", updateError);
        throw updateError;
      }

      // Update module permissions if provided
      if (modules !== undefined && Array.isArray(modules)) {
        // Delete existing permissions
        await supabaseAdmin
          .from("user_module_permissions")
          .delete()
          .eq("user_id", userId);

        // Insert new permissions
        if (modules.length > 0) {
          const moduleRecords = modules.map((moduleKey: string) => ({
            user_id: userId,
            module_key: moduleKey,
            is_visible: true,
          }));
          await supabaseAdmin.from("user_module_permissions").insert(moduleRecords);
        }
      }

      console.log("Profile updated successfully");
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: unknown) {
    console.error("Error:", error);
    const message = error instanceof Error ? error.message : "Erro desconhecido";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
