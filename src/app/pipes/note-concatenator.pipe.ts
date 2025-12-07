// note-concatenator.pipe.ts
import { Pipe, PipeTransform } from "@angular/core";

interface Note {
  note: string;
  id: number;
  part: number;
}

// Interface for the notes object
interface NotesObject {
  [stamp: string]: Note[];
}

@Pipe({
  name: "noteConcatenator",
  standalone: true, // Use standalone: true for Angular 14+
})
export class NoteConcatenatorPipe implements PipeTransform {
  /**
   * Transforms the NotesObject into a single concatenated and sorted string of notes.
   * @param value The notes object (e.g., { 'timestamp': [{...}, {...}] })
   * @param separator The string to use between concatenated notes (defaults to ' ')
   */
  transform(
    value: NotesObject | null | undefined,
    separator: string = " ",
  ): string {
    if (!value) {
      return "";
    }

    // 1. Extract and 2. Flatten all note arrays into a single array
    const allNotes: Note[] = Object.values(value).flat();

    // 3. Sort the notes numerically by the 'part' property
    const sortedNotes = allNotes.sort((a, b) => a.part - b.part);

    // 4. Extract the 'note' string from each and join them
    return sortedNotes.map((note) => note.note).join(separator);
  }
}
