import { useMutation, useQuery } from "@tanstack/react-query";
import { chat, getHealth, getAgentStatus, type ChatRequest, type ChatResponse } from "@/lib/api";

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

export function useEveChat() {
  return useMutation<ChatResponse, Error, ChatRequest>({
    mutationFn: chat,
  });
}

export function useEveHealth() {
  return useQuery({
    queryKey: ["eve", "health"],
    queryFn: () => getHealth(),
    retry: 1,
    staleTime: 30000,
  });
}

export function useEveStatus() {
  return useQuery({
    queryKey: ["eve", "status"],
    queryFn: getAgentStatus,
    retry: 1,
    staleTime: 60000,
  });
}
