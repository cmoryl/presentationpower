const warns = [];
const orig = console.warn;
console.warn = (...a) => warns.push(a.join(' '));
await import('./src/lib/module-preset-kits.ts');
console.warn = orig;
console.log(warns.join('\n\n'));
console.log('\nTOTAL:', warns.length);
