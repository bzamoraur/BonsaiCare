import { type CareEntry, listTreeEntries } from "@/server/care";
import { listTreePhotos, type PhotoWithUrl } from "@/server/photos";

/**
 * A tree's unified timeline: care-log entries and photos merged into one
 * date-descending stream (the "one coherent history per tree" the product exists
 * for — ADR-0005).
 *
 * Merged in application code for now — right for a personal collection's volume.
 * The read is behind this single function, so it can be swapped for a SQL
 * `union`/view (the scale path noted in the backlog's tech-debt register) without
 * touching the UI.
 *
 * Photos attached to a care entry (`care_log_entry_id` set) are folded into that
 * entry's item; standalone photos (`care_log_entry_id` null) are their own items.
 */

export type TimelineItem =
  | { kind: "care"; id: string; date: string; entry: CareEntry; photos: PhotoWithUrl[] }
  | { kind: "photo"; id: string; date: string; photo: PhotoWithUrl };

export async function listTreeTimeline(treeId: string): Promise<TimelineItem[]> {
  const [entries, photos] = await Promise.all([listTreeEntries(treeId), listTreePhotos(treeId)]);

  const photosByEntry = new Map<string, PhotoWithUrl[]>();
  const standalone: PhotoWithUrl[] = [];
  for (const photo of photos) {
    if (photo.care_log_entry_id) {
      const list = photosByEntry.get(photo.care_log_entry_id) ?? [];
      list.push(photo);
      photosByEntry.set(photo.care_log_entry_id, list);
    } else {
      standalone.push(photo);
    }
  }

  const items: TimelineItem[] = [
    ...entries.map(
      (entry): TimelineItem => ({
        kind: "care",
        id: entry.id,
        date: entry.occurred_at,
        entry,
        photos: photosByEntry.get(entry.id) ?? [],
      }),
    ),
    ...standalone.map(
      (photo): TimelineItem => ({ kind: "photo", id: photo.id, date: photo.taken_at, photo }),
    ),
  ];

  // Both dates are timestamptz ISO strings, so lexical compare orders them.
  items.sort((a, b) => b.date.localeCompare(a.date));
  return items;
}
