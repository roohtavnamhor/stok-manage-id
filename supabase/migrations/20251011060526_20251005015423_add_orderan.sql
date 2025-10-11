-- Add ORDERAN to jenis_stok_keluar if it doesn't exist
INSERT INTO jenis_stok_keluar (name, description)
VALUES ('ORDERAN', 'Stok keluar untuk orderan antar cabang')
ON CONFLICT DO NOTHING;