export type SectionKind = "priority" | "normal";

export type Section = {
  id: string;
  user_id: string;
  name: string;
  kind: SectionKind;
  position: number;
  collapsed: boolean;
  created_at: string;
};

export type WorkItem = {
  id: string;
  user_id: string;
  section_id: string;
  title: string;
  notes: string | null;
  done: boolean;
  position: number;
  created_at: string;
};

export type Countdown = {
  id: string;
  user_id: string;
  /** Set when the countdown was created from a work item's checkbox. */
  work_item_id: string | null;
  title: string;
  /** ISO `YYYY-MM-DD`, no time component. */
  start_date: string;
  end_date: string;
  position: number;
  collapsed: boolean;
  created_at: string;
};
