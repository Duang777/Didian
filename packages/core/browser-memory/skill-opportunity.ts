"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../api";
import { useWorkspaceId } from "../hooks";
import type {
  CreateSkillProposalRequest,
  SkillProposalStatus,
  UpdatePersonalSkillRequest,
  UpdateSkillProposalRequest,
} from "./types";

export const skillOpportunityKeys = {
  all: (wsId: string) => ["skill-opportunity", wsId] as const,
  proposals: (wsId: string, status?: SkillProposalStatus) =>
    [...skillOpportunityKeys.all(wsId), "proposals", status ?? "all"] as const,
  proposal: (wsId: string, id: string) => [...skillOpportunityKeys.all(wsId), "proposal", id] as const,
  personalSkills: (wsId: string, enabled?: boolean) =>
    [...skillOpportunityKeys.all(wsId), "personal-skills", enabled ?? "all"] as const,
  personalSkill: (wsId: string, id: string) =>
    [...skillOpportunityKeys.all(wsId), "personal-skill", id] as const,
};

export function useSkillProposals(status?: SkillProposalStatus) {
  const wsId = useWorkspaceId();
  return useQuery({
    queryKey: skillOpportunityKeys.proposals(wsId, status),
    queryFn: () => api.listSkillProposals(wsId, status),
  });
}

export function useSkillProposal(id: string) {
  const wsId = useWorkspaceId();
  return useQuery({
    queryKey: skillOpportunityKeys.proposal(wsId, id),
    queryFn: () => api.getSkillProposal(wsId, id),
    enabled: id !== "",
  });
}

export function usePersonalSkills(enabled?: boolean) {
  const wsId = useWorkspaceId();
  return useQuery({
    queryKey: skillOpportunityKeys.personalSkills(wsId, enabled),
    queryFn: () => api.listPersonalSkills(wsId, enabled),
  });
}

export function useCreateSkillProposal() {
  const qc = useQueryClient();
  const wsId = useWorkspaceId();
  return useMutation({
    mutationFn: (data: CreateSkillProposalRequest) => api.createSkillProposal(wsId, data),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: skillOpportunityKeys.proposals(wsId) });
    },
  });
}

export function useUpdateSkillProposal() {
  const qc = useQueryClient();
  const wsId = useWorkspaceId();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateSkillProposalRequest }) =>
      api.updateSkillProposal(wsId, id, data),
    onSettled: (_result, _err, { id }) => {
      qc.invalidateQueries({ queryKey: skillOpportunityKeys.proposal(wsId, id) });
      qc.invalidateQueries({ queryKey: skillOpportunityKeys.proposals(wsId) });
    },
  });
}

export function useConfirmSkillProposal() {
  const qc = useQueryClient();
  const wsId = useWorkspaceId();
  return useMutation({
    mutationFn: (id: string) => api.confirmSkillProposal(wsId, id),
    onSettled: (_result, _err, id) => {
      qc.invalidateQueries({ queryKey: skillOpportunityKeys.proposal(wsId, id) });
      qc.invalidateQueries({ queryKey: skillOpportunityKeys.proposals(wsId) });
      qc.invalidateQueries({ queryKey: skillOpportunityKeys.personalSkills(wsId) });
    },
  });
}

export function useDeleteSkillProposal() {
  const qc = useQueryClient();
  const wsId = useWorkspaceId();
  return useMutation({
    mutationFn: (id: string) => api.deleteSkillProposal(wsId, id),
    onSettled: (_result, _err, id) => {
      qc.invalidateQueries({ queryKey: skillOpportunityKeys.proposal(wsId, id) });
      qc.invalidateQueries({ queryKey: skillOpportunityKeys.proposals(wsId) });
    },
  });
}

export function useUpdatePersonalSkill() {
  const qc = useQueryClient();
  const wsId = useWorkspaceId();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdatePersonalSkillRequest }) =>
      api.updatePersonalSkill(wsId, id, data),
    onSettled: (_result, _e, { id }) => {
      qc.invalidateQueries({ queryKey: skillOpportunityKeys.personalSkill(wsId, id) });
      qc.invalidateQueries({ queryKey: skillOpportunityKeys.personalSkills(wsId) });
    },
  });
}

export function useUsePersonalSkill() {
  const qc = useQueryClient();
  const wsId = useWorkspaceId();
  return useMutation({
    mutationFn: (id: string) => api.usePersonalSkill(wsId, id),
    onSettled: (_result, _e, id) => {
      qc.invalidateQueries({ queryKey: skillOpportunityKeys.personalSkill(wsId, id) });
      qc.invalidateQueries({ queryKey: skillOpportunityKeys.personalSkills(wsId) });
    },
  });
}

export function useDeletePersonalSkill() {
  const qc = useQueryClient();
  const wsId = useWorkspaceId();
  return useMutation({
    mutationFn: (id: string) => api.deletePersonalSkill(wsId, id),
    onSettled: (_result, _e, id) => {
      qc.invalidateQueries({ queryKey: skillOpportunityKeys.personalSkill(wsId, id) });
      qc.invalidateQueries({ queryKey: skillOpportunityKeys.personalSkills(wsId) });
    },
  });
}
