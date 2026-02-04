## Baseline v1 – Model Evaluation Summary

We evaluate multi-horizon traffic speed prediction using a controlled synthetic traffic simulator built on OpenStreetMap road networks.

### Prediction Horizons (Hourly)
- 1 hour
- 2 hours
- 4 hours

### Naive Baseline (Last observed speed)
| Horizon | MAE (km/h) | RMSE (km/h) |
|-------|------------|-------------|
| 1h | ~5–6 | ~7–8 |
| 2h | ~6–7 | ~8–9 |
| 4h | 8.45 | 9.20 |

### XGBoost (Baseline v1)
| Horizon | MAE (km/h) | RMSE (km/h) |
|-------|------------|-------------|
| 1h | 0.49 | 0.64 |
| 2h | 0.49 | 0.63 |
| 4h | 0.48 | 0.60 |

### Key Observations
- XGBoost significantly outperforms the naive baseline across all horizons.
- Error remains stable across horizons due to smooth temporal dynamics in the synthetic simulator.
- This version establishes a correct and reproducible end-to-end forecasting pipeline.

> Future versions will introduce stochastic events (accidents, disruptions) to increase long-horizon uncertainty.
