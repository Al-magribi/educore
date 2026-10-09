import { useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Button,
  Card,
  Col,
  DatePicker,
  Flex,
  Form,
  Image,
  Input,
  Row,
  Select,
  Space,
  Spin,
  Tabs,
  Upload,
  message,
} from "antd";
import dayjs from "dayjs";
import {
  useGetBukuDetailQuery,
  useGetTuMetaQuery,
  useSaveBukuDetailMutation,
  useUploadBukuPhotoMutation,
} from "../../../service/lms/ApiTu";
import { STATUS_OPTIONS, errorMessage, mergeProfile } from "./profileDefaults";
import { TuPage } from "./tuUi";
import BukuNilaiPanel from "./BukuNilaiPanel";
import { downloadBukuIndukPdf, printBukuInduk } from "./bukuIndukDocument";

const dateField = (name, label) => (
  <Form.Item
    name={name}
    label={label}
    getValueProps={(value) => ({ value: value ? dayjs(value) : null })}
    normalize={(value) => (value ? value.format("YYYY-MM-DD") : "")}
  >
    <DatePicker style={{ width: "100%" }} format="DD-MM-YYYY" />
  </Form.Item>
);

const textField = (name, label) => (
  <Form.Item name={name} label={label}>
    <Input />
  </Form.Item>
);

const PersonFields = ({ prefix, title }) => (
  <Card size="small" title={title}>
    <Row gutter={12}>
      <Col xs={24} md={12}>{textField(["profile", prefix, "name"], "Nama")}</Col>
      <Col xs={24} md={6}>{textField(["profile", prefix, "birth_place"], "Tempat lahir")}</Col>
      <Col xs={24} md={6}>{dateField(["profile", prefix, "birth_date"], "Tanggal lahir")}</Col>
      <Col xs={24} md={8}>{textField(["profile", prefix, "religion"], "Agama")}</Col>
      <Col xs={24} md={8}>{textField(["profile", prefix, "citizenship"], "Kewarganegaraan")}</Col>
      <Col xs={24} md={8}>{textField(["profile", prefix, "education"], "Pendidikan terakhir")}</Col>
      <Col xs={24} md={8}>{textField(["profile", prefix, "job"], "Pekerjaan")}</Col>
      <Col xs={24} md={8}>{textField(["profile", prefix, "income"], "Penghasilan per bulan")}</Col>
      <Col xs={24} md={8}>{textField(["profile", prefix, "phone"], "Telepon")}</Col>
      <Col xs={24} md={12}>{textField(["profile", prefix, "address", "street"], "Jalan")}</Col>
      <Col xs={24} md={6}>{textField(["profile", prefix, "address", "village"], "Desa")}</Col>
      <Col xs={24} md={6}>{textField(["profile", prefix, "address", "district"], "Kecamatan")}</Col>
      <Col xs={24} md={6}>{textField(["profile", prefix, "address", "regency"], "Kabupaten")}</Col>
      <Col xs={24} md={6}>{textField(["profile", prefix, "address", "province"], "Provinsi")}</Col>
      <Col xs={24} md={6}>{textField(["profile", prefix, "condition"], "Keadaan")}</Col>
    </Row>
  </Card>
);

const BukuIndukDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const { data, isLoading } = useGetBukuDetailQuery(id, { skip: !id });
  const { data: metaData } = useGetTuMetaQuery();
  const [saveDetail, { isLoading: isSaving }] = useSaveBukuDetailMutation();
  const [uploadPhoto, { isLoading: isUploading }] = useUploadBukuPhotoMutation();
  const bundle = data?.data;
  const profile = mergeProfile(bundle?.buku?.profile);
  const hydratedId = useRef(null);

  useEffect(() => {
    if (!bundle?.buku?.id || hydratedId.current === bundle.buku.id) return;
    hydratedId.current = bundle.buku.id;
    form.setFieldsValue({
      register_no: bundle.buku.register_no,
      entry_year: bundle.buku.entry_year,
      student_status: bundle.buku.student_status,
      profile: mergeProfile(bundle.buku.profile),
    });
  }, [bundle, form]);

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      const response = await saveDetail({
        id,
        register_no: values.register_no || null,
        entry_year: values.entry_year || null,
        student_status: values.student_status,
        profile: values.profile,
      }).unwrap();
      message.success(response?.message || "Buku induk disimpan.");
    } catch (error) {
      if (error?.errorFields) return;
      message.error(errorMessage(error, "Gagal menyimpan buku induk."));
    }
  };

  const handlePhoto = async (slot, file) => {
    const body = new FormData();
    body.append("slot", slot);
    body.append("file", file);
    try {
      const response = await uploadPhoto({ id, body }).unwrap();
      message.success(response?.message || "Foto disimpan.");
    } catch (error) {
      message.error(errorMessage(error, "Gagal mengunggah foto."));
    }
    return false;
  };

  if (isLoading || !bundle) {
    return (
      <Flex justify="center" style={{ padding: 48 }}>
        <Spin />
      </Flex>
    );
  }

  return (
    <TuPage
      title={bundle.student?.full_name || "Buku induk"}
      description={`${bundle.student?.nis || "Tanpa NIS"} · ${bundle.student?.class_name || "Belum ada kelas"} · ${bundle.homebase_name || ""}`}
      extra={
        <Space wrap>
          <Button onClick={() => navigate("/tata-usaha/buku-induk")}>Kembali</Button>
          <Button onClick={() => printBukuInduk(bundle)}>Cetak</Button>
          <Button onClick={() => downloadBukuIndukPdf(bundle).catch((error) => message.error(error.message || "PDF gagal dibuat."))}>
            Unduh PDF
          </Button>
          <Button type="primary" loading={isSaving} onClick={handleSave}>
            Simpan
          </Button>
        </Space>
      }
    >
      <Card>
        <Form form={form} layout="vertical">
          <Tabs
            items={[
              {
                key: "identitas",
                label: "Identitas",
                forceRender: true,
                children: (
                  <Row gutter={12}>
                    <Col xs={24} md={6}>{textField("register_no", "Nomor urut")}</Col>
                    <Col xs={24} md={6}>{textField("entry_year", "Tahun masuk")}</Col>
                    <Col xs={24} md={6}>
                      <Form.Item name="student_status" label="Status siswa">
                        <Select options={STATUS_OPTIONS} />
                      </Form.Item>
                    </Col>
                    <Col xs={24} md={6}>{textField(["profile", "nickname"], "Nama panggilan")}</Col>
                    <Col xs={24} md={8}>{textField(["profile", "birth_place"], "Tempat lahir")}</Col>
                    <Col xs={24} md={8}>{dateField(["profile", "birth_date"], "Tanggal lahir")}</Col>
                    <Col xs={24} md={8}>{textField(["profile", "religion"], "Agama")}</Col>
                    <Col xs={24} md={8}>{textField(["profile", "citizenship"], "Kewarganegaraan")}</Col>
                    <Col xs={24} md={4}>{textField(["profile", "child_order"], "Anak ke")}</Col>
                    <Col xs={24} md={4}>{textField(["profile", "sibling_full"], "Saudara kandung")}</Col>
                    <Col xs={24} md={4}>{textField(["profile", "sibling_step"], "Saudara tiri")}</Col>
                    <Col xs={24} md={4}>{textField(["profile", "sibling_adopted"], "Saudara angkat")}</Col>
                    <Col xs={24} md={8}>{textField(["profile", "family_status"], "Status dalam keluarga")}</Col>
                    <Col xs={24} md={8}>{textField(["profile", "daily_language"], "Bahasa sehari-hari")}</Col>
                    <Col xs={24} md={8}>{textField(["profile", "living_with"], "Tinggal bersama")}</Col>
                    <Col xs={24}>{textField(["profile", "address", "street"], "Jalan")}</Col>
                    <Col xs={24} md={6}>{textField(["profile", "address", "district"], "Kecamatan")}</Col>
                    <Col xs={24} md={6}>{textField(["profile", "address", "regency"], "Kabupaten")}</Col>
                    <Col xs={24} md={6}>{textField(["profile", "address", "province"], "Provinsi")}</Col>
                    <Col xs={24} md={3}>{textField(["profile", "address", "postal_code"], "Kode pos")}</Col>
                    <Col xs={24} md={3}>{textField(["profile", "address", "phone"], "Telepon")}</Col>
                    <Col xs={24} md={6}>{textField(["profile", "health", "height_entry"], "Tinggi saat diterima")}</Col>
                    <Col xs={24} md={6}>{textField(["profile", "health", "height_leave"], "Tinggi saat meninggalkan")}</Col>
                    <Col xs={24} md={6}>{textField(["profile", "health", "weight_entry"], "Berat saat diterima")}</Col>
                    <Col xs={24} md={6}>{textField(["profile", "health", "weight_leave"], "Berat saat meninggalkan")}</Col>
                    <Col xs={24} md={8}>{textField(["profile", "health", "social_media"], "Media sosial")}</Col>
                    <Col xs={24} md={8}>{textField(["profile", "health", "illness"], "Penyakit yang pernah diderita")}</Col>
                    <Col xs={24} md={8}>{textField(["profile", "health", "physical_note"], "Kelainan jasmani")}</Col>
                    <Col xs={24} md={12}>
                      <Space direction="vertical">
                        <Upload
                          accept="image/png,image/jpeg,image/webp"
                          showUploadList={false}
                          beforeUpload={(file) => handlePhoto("entry", file)}
                        >
                          <Button loading={isUploading}>Foto awal</Button>
                        </Upload>
                        {profile.photo_entry ? <Image src={profile.photo_entry} width={96} /> : null}
                      </Space>
                    </Col>
                    <Col xs={24} md={12}>
                      <Space direction="vertical">
                        <Upload
                          accept="image/png,image/jpeg,image/webp"
                          showUploadList={false}
                          beforeUpload={(file) => handlePhoto("leave", file)}
                        >
                          <Button loading={isUploading}>Foto akhir</Button>
                        </Upload>
                        {profile.photo_leave ? <Image src={profile.photo_leave} width={96} /> : null}
                      </Space>
                    </Col>
                  </Row>
                ),
              },
              {
                key: "keluarga",
                label: "Orang tua dan wali",
                forceRender: true,
                children: (
                  <Flex vertical gap={12}>
                    <PersonFields prefix="father" title="Ayah" />
                    <PersonFields prefix="mother" title="Ibu" />
                    <PersonFields prefix="guardian" title="Wali" />
                  </Flex>
                ),
              },
              {
                key: "pendidikan",
                label: "Pendidikan",
                forceRender: true,
                children: (
                  <Flex vertical gap={12}>
                    <Card size="small" title="Pendidikan sebelumnya">
                      <Row gutter={12}>
                        <Col xs={24} md={12}>{textField(["profile", "prior_education", "school"], "Sekolah asal")}</Col>
                        <Col xs={24} md={6}>{dateField(["profile", "prior_education", "diploma_date"], "Tanggal ijazah")}</Col>
                        <Col xs={24} md={6}>{textField(["profile", "prior_education", "diploma_no"], "Nomor ijazah")}</Col>
                        <Col xs={24} md={8}>{textField(["profile", "prior_education", "skhun_no"], "Nomor SKHUN")}</Col>
                        <Col xs={24} md={8}>{textField(["profile", "prior_education", "exam_no"], "Nomor peserta ujian")}</Col>
                      </Row>
                    </Card>
                    <Card size="small" title="Diterima di sekolah ini">
                      <Row gutter={12}>
                        <Col xs={24} md={8}>{dateField(["profile", "accepted", "date"], "Tanggal")}</Col>
                        <Col xs={24} md={8}>{textField(["profile", "accepted", "class_name"], "Kelas")}</Col>
                      </Row>
                    </Card>
                    <Card size="small" title="Pindahan masuk">
                      <Row gutter={12}>
                        <Col xs={24} md={8}>{textField(["profile", "transfer_in", "school"], "Dari sekolah")}</Col>
                        <Col xs={24} md={8}>{dateField(["profile", "transfer_in", "date"], "Tanggal")}</Col>
                        <Col xs={24} md={8}>{textField(["profile", "transfer_in", "class_name"], "Kelas")}</Col>
                        <Col xs={24}>{textField(["profile", "transfer_in", "reason"], "Alasan")}</Col>
                      </Row>
                    </Card>
                    <Card size="small" title="Pindah keluar dan kelulusan">
                      <Row gutter={12}>
                        <Col xs={24} md={8}>{dateField(["profile", "transfer_out", "date"], "Tanggal pindah")}</Col>
                        <Col xs={24} md={8}>{textField(["profile", "transfer_out", "school"], "Sekolah tujuan")}</Col>
                        <Col xs={24} md={8}>{textField(["profile", "transfer_out", "reason"], "Alasan")}</Col>
                        <Col xs={24} md={8}>{dateField(["profile", "graduation", "date"], "Tanggal akhir pendidikan")}</Col>
                        <Col xs={24} md={8}>{textField(["profile", "graduation", "diploma_no"], "Nomor ijazah")}</Col>
                        <Col xs={24} md={8}>{textField(["profile", "graduation", "exam_no"], "Nomor peserta ujian")}</Col>
                      </Row>
                    </Card>
                    <Card size="small" title="Setelah lulus">
                      <Row gutter={12}>
                        <Col xs={24} md={8}>{textField(["profile", "after", "continue_to"], "Melanjutkan ke")}</Col>
                        <Col xs={24} md={8}>{textField(["profile", "after", "major"], "Jurusan")}</Col>
                        <Col xs={24} md={8}>{textField(["profile", "after", "workplace"], "Bekerja di")}</Col>
                        <Col xs={24} md={8}>{textField(["profile", "after", "income"], "Penghasilan")}</Col>
                      </Row>
                    </Card>
                    <Card size="small" title="Perkembangan">
                      <Row gutter={12}>
                        <Col xs={24} md={12}>{textField(["profile", "achievements", "art"], "Kesenian")}</Col>
                        <Col xs={24} md={12}>{textField(["profile", "achievements", "sport"], "Olahraga")}</Col>
                        <Col xs={24} md={12}>{textField(["profile", "achievements", "academic"], "Akademik")}</Col>
                        <Col xs={24} md={12}>{textField(["profile", "achievements", "other"], "Lainnya")}</Col>
                      </Row>
                      <Form.List name={["profile", "scholarships"]}>
                        {(fields, { add, remove }) => (
                          <Flex vertical gap={8}>
                            {fields.map((field) => (
                              <Row gutter={8} key={field.key}>
                                <Col xs={24} md={6}>
                                  <Form.Item name={[field.name, "year_label"]} label="Tahun">
                                    <Input />
                                  </Form.Item>
                                </Col>
                                <Col xs={24} md={14}>
                                  <Form.Item name={[field.name, "note"]} label="Beasiswa">
                                    <Input />
                                  </Form.Item>
                                </Col>
                                <Col xs={24} md={4}>
                                  <Button onClick={() => remove(field.name)} style={{ marginTop: 30 }}>
                                    Hapus
                                  </Button>
                                </Col>
                              </Row>
                            ))}
                            <Button onClick={() => add({ year_label: "", note: "" })}>
                              Tambah beasiswa
                            </Button>
                          </Flex>
                        )}
                      </Form.List>
                    </Card>
                  </Flex>
                ),
              },
              {
                key: "nilai",
                label: "Nilai",
                forceRender: true,
                children: (
                  <BukuNilaiPanel
                    bukuId={id}
                    detail={bundle}
                    meta={metaData?.data}
                  />
                ),
              },
            ]}
          />
        </Form>
      </Card>
    </TuPage>
  );
};

export default BukuIndukDetail;
