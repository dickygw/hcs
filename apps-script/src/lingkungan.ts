/**
 * Membedakan HCS-dev dan HCS-prod (WS-02). Hanya ID skrip HCS-dev yang ditulis di kode;
 * ID HCS-prod tidak pernah disimpan di repositori (AI-01). Selain HCS-dev dianggap produksi.
 */
export const ID_SKRIP_DEV = "1DvFXJzHuJPjCRTSOaRK6hEsBHcuXG-uog_rzqpu4XTAgrMRB1TQeyLIJ";

export function lingkungan(): "dev" | "prod" {
  return ScriptApp.getScriptId() === ID_SKRIP_DEV ? "dev" : "prod";
}
