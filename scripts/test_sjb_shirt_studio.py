"""Regression checks for wearer-scaled print fit, not visual certification."""
import importlib.util
from pathlib import Path
import unittest

spec = importlib.util.spec_from_file_location("studio", Path(__file__).with_name("sjb-shirt-studio.py"))
studio = importlib.util.module_from_spec(spec)
spec.loader.exec_module(studio)

class PrintFitTests(unittest.TestCase):
    def test_tall_back_art_stays_above_lower_torso(self):
        for box, lower_limit in zip(studio.BACKS, (1070, 1070, 1092)):
            cx, top, width, height = studio.fit_print(722, 749, box)
            self.assertLessEqual(width, box[2])
            self.assertLessEqual(height, box[3])
            self.assertLessEqual(top + height + 18, lower_limit)

    def test_all_print_styles_scale_down_for_smaller_wearers(self):
        for boxes in (studio.FRONTS, studio.BACKS, studio.LEFT_CHEST):
            for artwork in ((722, 749), (1100, 300), (800, 1200)):
                fits = [studio.fit_print(*artwork, box) for box in boxes]
                self.assertGreater(fits[0][2], fits[1][2])
                self.assertGreater(fits[1][2], fits[2][2])
                self.assertGreater(fits[0][3], fits[1][3])
                self.assertGreater(fits[1][3], fits[2][3])

    def test_wide_art_preserves_aspect_ratio_and_width_limits(self):
        for boxes in (studio.FRONTS, studio.BACKS, studio.LEFT_CHEST):
            for box in boxes:
                _, _, width, height = studio.fit_print(1100, 300, box)
                self.assertLessEqual(width, box[2])
                self.assertLessEqual(height, box[3])
                self.assertAlmostEqual(width / height, 1100 / 300, delta=.3)

if __name__ == "__main__":
    unittest.main()