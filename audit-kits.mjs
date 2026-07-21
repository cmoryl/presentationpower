globalThis.import = globalThis.import || {};
process.env.NODE_ENV='development';
// stub import.meta.env by transforming... simpler: just intercept
const warns = [];
const orig = console.warn;
console.warn = (...a) => warns.push(a.join(' '));
// Read file and eval workaround: import validators directly
const { validateKitPayload, formatKitValidationError } = await import('./src/lib/kit-validation.ts');
const mod = await import('./src/lib/module-preset-kits.ts').catch(e => { console.error('import err', e.message); return null; });
console.warn = orig;
console.log(warns.join('\n\n'));
console.log('TOTAL:', warns.length);
