import { SECTION_FRAMEWORKS, MODULE_VARIANTS } from './src/lib/taxonomy.ts';
// For each family, list sections that permit it
const familyToSections = {};
for (const s of SECTION_FRAMEWORKS) {
  for (const f of s.permittedFamilyIds) {
    (familyToSections[f] ||= []).push(s.id + ' — ' + s.name);
  }
}
console.log(JSON.stringify(familyToSections, null, 2));
