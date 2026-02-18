import { useEffect, useState } from "react";
import { eventBus, Events } from "../../../core/events/EventBus";
import InteractionPrompt from "./InteractionPrompt";
import NoteModal from "./NoteModal";
import LinkModal from "./LinkModal";
import ImageModal from "./ImageModal";

interface InteractionPayload {
  type: "note" | "link" | "image";
  name: string;
  data: {
    title?: string;
    content?: string;
    url?: string;
    imageUrl?: string;
  };
}

export default function InteractionOverlay() {
  const [nearObjectName, setNearObjectName] = useState<string | null>(null);
  const [interaction, setInteraction] = useState<InteractionPayload | null>(null);

  useEffect(() => {
    const unsubs = [
      eventBus.on(Events.OBJECT_PROXIMITY_ENTER, (payload: { name: string }) => {
        setNearObjectName(payload.name);
      }),
      eventBus.on(Events.OBJECT_PROXIMITY_EXIT, () => {
        setNearObjectName(null);
      }),
      eventBus.on(Events.OBJECT_INTERACT, (payload: InteractionPayload) => {
        setInteraction(payload);
      }),
    ];

    return () => unsubs.forEach((unsub) => unsub());
  }, []);

  const handleClose = () => {
    setInteraction(null);
    eventBus.emit(Events.OBJECT_INTERACTION_CLOSE);
  };

  return (
    <>
      {nearObjectName && !interaction && (
        <InteractionPrompt objectName={nearObjectName} />
      )}

      {interaction?.type === "note" && (
        <NoteModal
          title={interaction.data.title ?? interaction.name}
          content={interaction.data.content ?? ""}
          onClose={handleClose}
        />
      )}

      {interaction?.type === "link" && (
        <LinkModal
          title={interaction.data.title ?? interaction.name}
          url={interaction.data.url ?? "#"}
          description={interaction.data.content}
          onClose={handleClose}
        />
      )}

      {interaction?.type === "image" && (
        <ImageModal
          title={interaction.data.title ?? interaction.name}
          imageUrl={interaction.data.imageUrl ?? ""}
          description={interaction.data.content}
          onClose={handleClose}
        />
      )}
    </>
  );
}
