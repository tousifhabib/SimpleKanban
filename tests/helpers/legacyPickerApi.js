// Test-harness adapter mapping the legacy RandomPickerManager API onto
// the pure picker domain + options adapter. Math.random is read at pick
// time so suite stubs keep working, exactly like production wiring where
// fx.random() delegates to the rng port.

import {
  pickRandomCard,
  cardWeight,
  poolStats,
} from '../../js/domain/picker/weights.js';
import { createPickerOptions } from '../../js/app/pickerOptions.js';
import { createEnv } from '../../js/ports/env.js';

export const legacyRandomPicker = () => {
  const env = createEnv(window);
  const options = createPickerOptions(env);

  return {
    getOptions: options.get,
    setOptions: options.set,
    resetOptions: options.reset,
    calculateWeight: (card) => cardWeight(options.get(), new Date())(card),
    pickRandomCard: (board) =>
      pickRandomCard(board, options.get(), new Date(), Math.random()),
    getPoolStats: (board) => poolStats(options.get())(board),
  };
};
