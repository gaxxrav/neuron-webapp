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

export type Task = {
  id: string;
  user_id: string;
  section_id: string;
  /** Where the item sat before being promoted to priority, if anywhere. */
  previous_section_id: string | null;
  title: string;
  notes: string | null;
  done: boolean;
  position: number;
  created_at: string;
};

export type EventItem = {
  id: string;
  user_id: string;
  /** Set when the event was created from a task's checkbox. */
  work_item_id: string | null;
  title: string;
  /** ISO `YYYY-MM-DD`, no time component. */
  start_date: string;
  end_date: string;
  position: number;
  collapsed: boolean;
  created_at: string;
};
