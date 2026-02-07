import React from "react";
import { Alert, Table, Typography } from "antd";
import { Info } from "lucide-react";

const ImportInstruction = () => (
  <div style={{ marginBottom: 20 }}>
    <Alert
      title="Aturan Pengisian Excel"
      type="info"
      showIcon
      icon={<Info size={18} />}
      description={
        <div style={{ overflowX: "auto" }}>
          <Table
            size="small"
            pagination={false}
            bordered
            style={{ marginTop: 10, minWidth: "400px" }}
            dataSource={[
              { id: 1, tipe: "PG", key: "Huruf (A/B/C)" },
              { id: 4, tipe: "Isian", key: "Jawaban (10, Sepuluh)" },
              { id: 5, tipe: "B/S", key: "Tulis 'Benar'/'Salah'" },
              { id: 6, tipe: "Jodoh", key: "Sisi Kiri | Sisi Ranan" },
              { id: 3, tipe: "Uraian", key: "-" },
            ]}
            columns={[
              { title: "ID", dataIndex: "id", key: "id", width: 50 },
              { title: "Jenis", dataIndex: "tipe", key: "tipe", width: 80 },
              { title: "Isi Kolom Key / Option", dataIndex: "key", key: "key" },
            ]}
          />
        </div>
      }
    />
  </div>
);

export default ImportInstruction;
