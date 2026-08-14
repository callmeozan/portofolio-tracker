import { isRequestAuthenticated } from './lib/session.js'

export default function handler(req, res) {
  return res.status(200).json({ isAdmin: isRequestAuthenticated(req) })
}
