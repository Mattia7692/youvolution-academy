import { Resend } from "resend";

// Il client va creato solo quando serve davvero mandare un'email, non al
// semplice import del modulo: la SDK lancia un errore sincrono dal
// costruttore se RESEND_API_KEY manca, e altrimenti quell'errore romperebbe
// in cascata anche le server action che non c'entrano nulla con le email
// (es. verificaIscrizione), solo perche' condividono lo stesso file.
let client: Resend | null = null;

export function getResend(): Resend {
  if (!client) {
    client = new Resend(process.env.RESEND_API_KEY);
  }
  return client;
}

export const MITTENTE_ACADEMY = process.env.RESEND_MITTENTE ?? "Youvolution Academy <info@youvolution.org>";
