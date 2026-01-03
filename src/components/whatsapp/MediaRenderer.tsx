import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";

type MediaKind = "image" | "audio" | "video";

function isDataUrl(url: string) {
  return url.startsWith("data:");
}

export function MediaRenderer({
  kind,
  url,
  alt,
  className,
}: {
  kind: MediaKind;
  url: string;
  alt?: string;
  className?: string;
}) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["whatsapp-media", url],
    queryFn: async () => {
      if (isDataUrl(url)) return { dataUrl: url };
      const { data, error } = await supabase.functions.invoke("fetch-media", {
        body: { url },
      });
      if (error) throw error;
      if (!data?.dataUrl) throw new Error("Falha ao carregar mídia");
      return { dataUrl: data.dataUrl as string };
    },
    staleTime: 1000 * 60 * 10,
  });

  if (isLoading) {
    return <Skeleton className={kind === "image" ? "h-40 w-[250px] rounded-lg" : "h-10 w-[250px] rounded"} />;
  }

  if (isError || !data?.dataUrl) {
    return (
      <div className="text-xs text-muted-foreground">
        Não foi possível carregar a mídia.
      </div>
    );
  }

  if (kind === "image") {
    return (
      <img
        src={data.dataUrl}
        alt={alt || "Imagem"}
        loading="lazy"
        className={className}
        onClick={() => window.open(data.dataUrl, "_blank")}
      />
    );
  }

  if (kind === "video") {
    return (
      <video controls preload="metadata" className={className}>
        <source src={data.dataUrl} />
        Seu navegador não suporta vídeo.
      </video>
    );
  }

  return (
    <audio controls className={className} preload="metadata">
      <source src={data.dataUrl} />
      Seu navegador não suporta áudio.
    </audio>
  );
}
