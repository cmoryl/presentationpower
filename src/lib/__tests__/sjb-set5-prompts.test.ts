import { describe, expect, it } from 'vitest';
import { SJB_SET5_ASSETS } from '../sjb-set5-assets';
import { SJB_SET5_PROMPT_DNA, set5CreationPrompt } from '../sjb-set5-prompts';

describe('Set 5 creation prompts', () => {
  it('gives every gallery asset a detailed standalone prompt', () => {
    for (const asset of SJB_SET5_ASSETS) {
      const prompt = set5CreationPrompt(asset);
      expect(prompt.length, asset.id).toBeGreaterThan(400);
      expect(prompt, asset.id).toContain('San Juan Bowl');
      expect(prompt, asset.id).toContain('#0D0E21');
    }
  });

  it('never repeats a prompt between assets', () => {
    const prompts = SJB_SET5_ASSETS.map(a => set5CreationPrompt(a));
    expect(new Set(prompts).size).toBe(SJB_SET5_ASSETS.length);
  });

  it('writes the correct message line and language into full designs', () => {
    const byId = new Map(SJB_SET5_ASSETS.map(a => [a.id, a]));
    expect(set5CreationPrompt(byId.get('full-board-1728x512-thirds-left-wide-std-en')!)).toContain('"SAVE THE DATE"');
    expect(set5CreationPrompt(byId.get('full-board-840x400-thirds-right-wide-tix-es')!)).toContain('"BOLETOS A LA VENTA"');
    expect(set5CreationPrompt(byId.get('full-social-thirds-top-story-std-es')!)).toContain('1088 × 1920');
    expect(set5CreationPrompt(byId.get('full-social-thirds-top-story-std-es')!)).toContain('Spanish');
  });

  it('marks enlarged variants with the 12,000px guidance', () => {
    const byId = new Map(SJB_SET5_ASSETS.map(a => [a.id, a]));
    const enlarged = set5CreationPrompt(byId.get('variety-power-wide-enlarged')!);
    expect(enlarged).toContain('12,000 px');
    const native = set5CreationPrompt(byId.get('variety-power-wide')!);
    expect(native).not.toContain('ENLARGED');
    expect(enlarged.startsWith(SJB_SET5_PROMPT_DNA)).toBe(true);
  });

  it('tells users never to AI-generate the official shield', () => {
    const byId = new Map(SJB_SET5_ASSETS.map(a => [a.id, a]));
    expect(set5CreationPrompt(byId.get('base-official-logos-sjb-logo-color.svg')!)).toContain('Do NOT AI-generate');
    expect(set5CreationPrompt(byId.get('base-official-logos-sjb-logo-dark.svg')!)).toContain('white-outline');
  });
});
