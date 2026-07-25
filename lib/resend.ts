import { Resend } from "resend";

// Un client per import: la SDK lo tiene leggero, niente bisogno di
// ricrearlo ad ogni server action.
export const resend = new Resend(process.env.RESEND_API_KEY);

export const MITTENTE_ACADEMY = process.env.RESEND_MITTENTE ?? "Youvolution Academy <info@youvolution.org>";
