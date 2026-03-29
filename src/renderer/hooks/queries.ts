import { useQuery } from "@tanstack/react-query";

export const useConfig = () => {
  return useQuery({
    queryKey: ["config"],
    queryFn: () => window.clippi.loadConfig(),
  });
};

export const useRecentGames = (limit: number) => {
  return useQuery({
    queryKey: ["recentGames", limit],
    queryFn: () => window.clippi.getRecentGames(limit),
  });
};

export const useOverallRecord = () => {
  return useQuery({
    queryKey: ["overallRecord"],
    queryFn: () => window.clippi.getOverallRecord(),
  });
};

export const useMatchupRecords = () => {
  return useQuery({
    queryKey: ["matchupRecords"],
    queryFn: () => window.clippi.getMatchupRecords(),
  });
};

export const useStageRecords = () => {
  return useQuery({
    queryKey: ["stageRecords"],
    queryFn: () => window.clippi.getStageRecords(),
  });
};

export const useOpponents = (search?: string) => {
  return useQuery({
    queryKey: ["opponents", search],
    queryFn: () => window.clippi.getOpponents(search),
  });
};

export const useSets = () => {
  return useQuery({
    queryKey: ["sets"],
    queryFn: () => window.clippi.getSets(),
  });
};

export const useOpponentDetail = (opponentKey: string | null) => {
  return useQuery({
    queryKey: ["opponentDetail", opponentKey],
    queryFn: () => opponentKey ? window.clippi.getOpponentDetail(opponentKey) : null,
    enabled: !!opponentKey,
  });
};

export const useCharacterList = () => {
  return useQuery({
    queryKey: ["characterList"],
    queryFn: () => window.clippi.getCharacterList(),
  });
};

export const useCharacterMatchups = (character: string | null) => {
  return useQuery({
    queryKey: ["characterMatchups", character],
    queryFn: () => character ? window.clippi.getCharacterMatchups(character) : null,
    enabled: !!character,
  });
};

export const useCharacterStageStats = (character: string | null) => {
  return useQuery({
    queryKey: ["characterStageStats", character],
    queryFn: () => character ? window.clippi.getCharacterStageStats(character) : null,
    enabled: !!character,
  });
};

export const useCharacterSignatureStats = (character: string | null) => {
  return useQuery({
    queryKey: ["characterSignatureStats", character],
    queryFn: () => character ? window.clippi.getCharacterSignatureStats(character) : null,
    enabled: !!character,
  });
};

export const useCharacterGameStats = (character: string | null) => {
  return useQuery({
    queryKey: ["characterGameStats", character],
    queryFn: () => character ? window.clippi.getCharacterGameStats(character) : null,
    enabled: !!character,
  });
};

export const useGetLatestAnalysis = () => {
  return useQuery({
    queryKey: ["latestAnalysis"],
    queryFn: () => window.clippi.getLatestAnalysis(),
  });
};
