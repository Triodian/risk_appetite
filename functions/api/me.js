import { json } from '../../lib/db.js';
export const onRequestGet = ({ data }) => json({ email: data.email });
