import { describe, expect, it } from 'vitest';
import { calculateSquareCrop, calculateTargetDimensions } from '@/utils/imageCompressor';

describe('imageCompressor geometry', () => {
  it('centre-crops landscape and portrait photos to the largest square', () => {
    expect(calculateSquareCrop(1600, 900)).toEqual({ sx: 350, sy: 0, side: 900 });
    expect(calculateSquareCrop(900, 1600)).toEqual({ sx: 0, sy: 350, side: 900 });
    expect(calculateSquareCrop(500, 500)).toEqual({ sx: 0, sy: 0, side: 500 });
  });

  it('keeps the aspect ratio when shrinking to the max dimension', () => {
    expect(calculateTargetDimensions(2048, 1024, 1024)).toEqual({ width: 1024, height: 512 });
    expect(calculateTargetDimensions(800, 600, 1024)).toEqual({ width: 800, height: 600 });
  });
});
