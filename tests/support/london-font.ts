// Unit tests build real London signage masters, and those masters outline every
// piece of copy with the shipped Geist Bold face. Load it once per test file so
// the synchronous builders have it in memory.
import { loadLondonSignageFace } from "@/lib/next-london-text-outline";

await loadLondonSignageFace();
