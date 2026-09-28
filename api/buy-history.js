import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY
)

export default async function handler(req, res) {
  // 1. POST (Tambah Data)
  if (req.method === 'POST') {
    try {
      const { kode, tanggal_beli, jumlah_lot, harga_beli, total_investasi, modal_dca, catatan } = req.body

      const { data, error } = await supabase
        .from('buy_history')
        .insert([{ 
          kode, 
          tanggal_beli, 
          jumlah_lot, 
          harga_beli, 
          total_investasi, 
          modal_dca: modal_dca || total_investasi,
          catatan 
        }])
        .select()

      if (error) throw error
      return res.status(200).json({ success: true, data })
    } catch (error) {
      return res.status(500).json({ error: error.message })
    }
  }

  // 2. PUT (Edit / Update Data)
  if (req.method === 'PUT') {
    try {
      const { id, tanggal_beli, jumlah_lot, harga_beli, total_investasi, modal_dca, catatan } = req.body

      if (!id) return res.status(400).json({ error: 'ID wajib disertakan' })

      const { data, error } = await supabase
        .from('buy_history')
        .update({
          tanggal_beli,
          jumlah_lot,
          harga_beli,
          total_investasi,
          modal_dca,
          catatan
        })
        .eq('id', id)
        .select()

      if (error) throw error
      return res.status(200).json({ success: true, data })
    } catch (error) {
      return res.status(500).json({ error: error.message })
    }
  }

  // 3. DELETE (Hapus Data)
  if (req.method === 'DELETE') {
    try {
      const { id } = req.body

      if (!id) return res.status(400).json({ error: 'ID wajib disertakan' })

      const { error } = await supabase.from('buy_history').delete().eq('id', id)

      if (error) throw error
      return res.status(200).json({ success: true })
    } catch (error) {
      return res.status(500).json({ error: error.message })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}