import { create } from "zustand";

type StatusViewState = {
  showTimestamp: boolean;
  toggleShowTimestamp: () => void;
};

export const useStatusViewStore = create<StatusViewState>((set) => ({
  showTimestamp: true,
  toggleShowTimestamp: () =>
    set((state) => ({
      showTimestamp: !state.showTimestamp,
    })),
}));
