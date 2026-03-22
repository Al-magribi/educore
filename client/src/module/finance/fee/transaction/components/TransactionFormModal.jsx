import { Alert, Button, Card, Col, Form, Input, InputNumber, Modal, Row, Select, Space, Spin, Typography } from "antd";
import dayjs from "dayjs";

const { Title, Text } = Typography;

const currencyFormatter = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});

const rupiahInputProps = {
  min: 0,
  precision: 0,
  style: { width: "100%" },
  formatter: (value) =>
    value === undefined || value === null || value === ""
      ? ""
      : `Rp ${new Intl.NumberFormat("id-ID").format(Number(value))}`,
  parser: (value) => value?.replace(/[^\d]/g, "") || "",
};

const sectionCardStyle = {
  borderRadius: 20,
  border: "1px solid rgba(148, 163, 184, 0.18)",
  boxShadow: "0 10px 28px rgba(15, 23, 42, 0.06)",
};

const mutedPanelStyle = {
  borderRadius: 16,
  background: "linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%)",
  border: "1px solid rgba(148, 163, 184, 0.14)",
};

const getOtherPaymentSelectionKey = (charge) =>
  charge?.charge_id ? `charge-${charge.charge_id}` : `type-${charge?.type_id}`;

const sortStudents = (students = []) =>
  [...students].sort((left, right) => {
    const gradeCompare = String(left.grade_name || "").localeCompare(
      String(right.grade_name || ""),
      "id",
      { numeric: true, sensitivity: "base" },
    );

    if (gradeCompare !== 0) {
      return gradeCompare;
    }

    const classCompare = String(left.class_name || "").localeCompare(
      String(right.class_name || ""),
      "id",
      { numeric: true, sensitivity: "base" },
    );

    if (classCompare !== 0) {
      return classCompare;
    }

    return String(left.full_name || "").localeCompare(
      String(right.full_name || ""),
      "id",
      { sensitivity: "base" },
    );
  });

const getOtherPaymentStatusText = (charge, selection) => {
  const amountDue = Number(charge.amount_due || 0);
  const paidAmount = Number(charge.paid_amount || 0);
  const remainingAmount = Number(charge.remaining_amount || 0);
  const currentPayment = Number(selection?.amount_paid || 0);
  const nextInstallmentNumber = Number(charge.installment_count || 0) + 1;

  if (currentPayment <= 0) {
    return `Sudah dibayar ${currencyFormatter.format(paidAmount)} dari ${currencyFormatter.format(amountDue)}. Sisa ${currencyFormatter.format(remainingAmount)}.`;
  }

  if (paidAmount === 0 && currentPayment >= remainingAmount) {
    return `Pembayaran ini akan langsung melunasi tagihan ${currencyFormatter.format(amountDue)}.`;
  }

  const newRemaining = Math.max(remainingAmount - currentPayment, 0);
  return `Pembayaran ini akan dicatat sebagai cicilan ke-${nextInstallmentNumber}. Sisa setelah pembayaran ${currencyFormatter.format(newRemaining)}.`;
};

const TransactionFormModal = ({
  open,
  loadingOpen,
  isStudentOptionsLoading,
  form,
  editingTransaction,
  onCancel,
  onSubmit,
  onReset,
  confirmLoading,
  periodes,
  students,
  student,
  unpaidMonths,
  tariffAmount,
  otherCharges,
  otherPaymentSelections,
  totalMonthlyAmount,
  selectedOtherTotal,
  grandTotal,
  onOtherPaymentAmountChange,
}) => {
  const sortedStudents = sortStudents(students);

  return (
    <>
      <Modal
        open={loadingOpen}
        title='Menyiapkan Data Siswa'
        footer={null}
        closable={false}
        maskClosable={false}
        keyboard={false}
        centered
        destroyOnHidden
        width={420}
      >
        <Space
          direction='vertical'
          size={12}
          style={{ width: "100%", padding: "12px 0", textAlign: "center" }}
        >
          <Spin size='large' />
          <Text strong>Memuat daftar siswa...</Text>
          <Text type='secondary'>
            Modal transaksi akan ditampilkan setelah data siswa selesai diambil.
          </Text>
        </Space>
      </Modal>

      <Modal
        title={editingTransaction ? "Edit Transaksi" : "Input Transaksi"}
        open={open}
        onCancel={onCancel}
        onOk={form.submit}
        confirmLoading={confirmLoading}
        okText={editingTransaction ? "Update Transaksi" : "Simpan Transaksi"}
        cancelText='Reset'
        cancelButtonProps={{ onClick: onReset }}
        okButtonProps={{ disabled: !student || grandTotal <= 0 || isStudentOptionsLoading }}
        width='min(1120px, calc(100vw - 24px))'
        centered
        destroyOnHidden
        styles={{
          body: {
            paddingTop: 8,
            maxHeight: "calc(100vh - 140px)",
            overflowY: "auto",
            overflowX: "hidden",
          },
        }}
      >
        {editingTransaction ? (
          <Alert
            type='info'
            showIcon
            style={{ marginBottom: 16, borderRadius: 14 }}
            message={`Sedang mengedit transaksi ${editingTransaction.category === "spp" ? "SPP" : "pembayaran lainnya"} untuk ${editingTransaction.student_name}.`}
            action={
              <Button size='small' onClick={onReset}>
                Batal Edit
              </Button>
            }
          />
        ) : null}

        <Form form={form} layout='vertical' onFinish={onSubmit}>
        <Form.Item name='grade_id' hidden>
          <Input />
        </Form.Item>
        <Form.Item name='class_id' hidden>
          <Input />
        </Form.Item>

        <Card
          style={{
            ...sectionCardStyle,
            marginBottom: 16,
            background: "linear-gradient(135deg, #f8fafc 0%, #eef6ff 100%)",
          }}
          styles={{ body: { padding: 18 } }}
        >
          <Space direction='vertical' size={14} style={{ width: "100%" }}>
            <Row gutter={[16, 4]}>
              <Col xs={24} md={12}>
                <Text strong style={{ fontSize: 16 }}>
                  {editingTransaction ? "Perbarui transaksi yang sudah tercatat" : "Buat transaksi pembayaran baru"}
                </Text>
                <div>
                  <Text type='secondary'>
                    Pilih siswa, lalu tentukan pembayaran SPP dan non-SPP dalam satu form.
                  </Text>
                </div>
              </Col>
              <Col xs={24} md={12}>
                <Card
                  size='small'
                  style={{
                    ...mutedPanelStyle,
                    background: "linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)",
                  }}
                  styles={{ body: { padding: 14 } }}
                >
                  <Space direction='vertical' size={0}>
                    <Text strong>Total transaksi</Text>
                    <Title level={3} style={{ margin: "4px 0 0" }}>
                      {currencyFormatter.format(grandTotal)}
                    </Title>
                    <Text type='secondary'>
                      SPP {currencyFormatter.format(totalMonthlyAmount)} + lainnya{" "}
                      {currencyFormatter.format(selectedOtherTotal)}
                    </Text>
                  </Space>
                </Card>
              </Col>
            </Row>

            <Row gutter={[16, 8]}>
              <Col xs={24} lg={10}>
                <Form.Item
                  name='periode_id'
                  label='Periode'
                  rules={[{ required: true, message: "Periode wajib dipilih" }]}
                  style={{ marginBottom: 0 }}
                >
                  <Select
                    options={periodes.map((item) => ({
                      value: item.id,
                      label: item.is_active ? `${item.name} (Aktif)` : item.name,
                    }))}
                    onChange={() =>
                      form.setFieldsValue({
                        grade_id: undefined,
                        class_id: undefined,
                        student_id: undefined,
                        bill_months: [],
                        other_payments: {},
                        payment_date: dayjs(),
                      })
                    }
                    virtual={false}
                  />
                </Form.Item>
              </Col>
              <Col xs={24} lg={14}>
                <Form.Item
                  name='student_id'
                  label='Siswa'
                  rules={[{ required: true, message: "Siswa wajib dipilih" }]}
                  style={{ marginBottom: 0 }}
                >
                  <Select
                    allowClear
                    showSearch={{ optionFilterProp: "label" }}
                    placeholder='Pilih siswa'
                    options={sortedStudents.map((item) => ({
                      value: item.id,
                      label: `${item.grade_name || "-"} | ${item.class_name || "-"} | ${item.full_name} ${item.nis ? `(${item.nis})` : ""}`,
                    }))}
                    onChange={(value) => {
                      const selectedStudent = sortedStudents.find((item) => item.id === value);

                      form.setFieldsValue({
                        grade_id: selectedStudent?.grade_id,
                        class_id: selectedStudent?.class_id,
                        payment_date: dayjs(),
                        bill_months: [],
                        other_payments: {},
                      });
                    }}
                    virtual={false}
                  />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={[16, 8]}>
              <Col xs={24} md={12}>
                <Form.Item name='payment_method' label='Metode Pembayaran' style={{ marginBottom: 0 }}>
                  <Select
                    placeholder='Pilih metode pembayaran'
                    virtual={false}
                    options={[
                      { value: "Cash", label: "Cash" },
                      { value: "Transfer", label: "Transfer" },
                    ]}
                  />
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Card size='small' style={mutedPanelStyle} styles={{ body: { padding: 12 } }}>
                  <Space direction='vertical' size={0}>
                    <Text strong>Data siswa terpilih</Text>
                    <Text type='secondary'>
                      {student
                        ? `${student.grade_name || "-"} | ${student.class_name || "-"} | ${student.student_name || student.full_name || "-"}`
                        : "Belum ada siswa dipilih"}
                    </Text>
                    <Text type='secondary'>
                      {student?.nis ? `NIS ${student.nis}` : "NIS belum tersedia"}
                    </Text>
                  </Space>
                </Card>
              </Col>
              <Col xs={24}>
                <Form.Item name='notes' label='Catatan' style={{ marginBottom: 0 }}>
                  <Input.TextArea rows={2} placeholder='Opsional' />
                </Form.Item>
              </Col>
            </Row>
          </Space>
        </Card>

        <Row gutter={[16, 16]}>
          <Col xs={24} xl={11}>
            <Card
              size='small'
              title='Pembayaran SPP'
              style={{ ...sectionCardStyle, height: "100%" }}
              styles={{ body: { padding: 16 } }}
            >
              {student ? (
                <Space direction='vertical' size={14} style={{ width: "100%" }}>
                  <Alert
                    type={tariffAmount > 0 ? "info" : "warning"}
                    showIcon
                    style={{ borderRadius: 14 }}
                    message={
                      tariffAmount > 0
                        ? `Tarif aktif ${currencyFormatter.format(tariffAmount)} per bulan`
                        : "Tarif SPP aktif belum tersedia untuk periode dan tingkat ini"
                    }
                  />
                  <Form.Item name='bill_months' label='Bulan yang Dibayar' style={{ marginBottom: 8 }}>
                    <Select
                      mode='multiple'
                      placeholder='Pilih bulan SPP'
                      allowClear
                      showSearch={{ optionFilterProp: "label" }}
                      options={unpaidMonths.map((item) => ({
                        value: item.value,
                        label: item.label,
                      }))}
                      disabled={tariffAmount <= 0 || unpaidMonths.length === 0}
                      virtual={false}
                    />
                  </Form.Item>
                  <Card size='small' style={mutedPanelStyle} styles={{ body: { padding: 12 } }}>
                    <Text type='secondary'>
                      Bulan belum lunas:{" "}
                      {unpaidMonths.length > 0
                        ? unpaidMonths.map((item) => item.label).join(", ")
                        : "Tidak ada"}
                    </Text>
                  </Card>
                </Space>
              ) : (
                <Text type='secondary'>
                  Pilih siswa untuk melihat bulan SPP yang belum lunas.
                </Text>
              )}
            </Card>
          </Col>

          <Col xs={24} xl={13}>
            <Card
              size='small'
              title={`Pembayaran Lainnya${otherCharges.length ? ` (${otherCharges.length})` : ""}`}
              style={{ ...sectionCardStyle, height: "100%" }}
              styles={{ body: { padding: 16 } }}
            >
              {student ? (
                otherCharges.length > 0 ? (
                  <div
                    style={{
                      display: "grid",
                      gap: 12,
                      maxHeight: 420,
                      overflowY: "auto",
                      paddingRight: 4,
                    }}
                  >
                    {otherCharges.map((charge) => {
                      const selectionKey = getOtherPaymentSelectionKey(charge);
                      const fieldValue = otherPaymentSelections?.[selectionKey] || {};

                      return (
                        <Card
                          key={selectionKey}
                          size='small'
                          style={{ ...mutedPanelStyle, background: "#f8fafc" }}
                          styles={{ body: { padding: 14 } }}
                        >
                          <Space direction='vertical' size={12} style={{ width: "100%" }}>
                            <Row gutter={[12, 8]} align='middle'>
                              <Col xs={24} md={14}>
                                <Space direction='vertical' size={2}>
                                  <Text strong>{charge.type_name}</Text>
                                  <Text type='secondary'>
                                    Tagihan {currencyFormatter.format(Number(charge.amount_due || 0))}
                                  </Text>
                                  <Text type='secondary'>
                                    Sudah dibayar {currencyFormatter.format(Number(charge.paid_amount || 0))}
                                  </Text>
                                  <Text type='secondary'>
                                    Sisa {currencyFormatter.format(Number(charge.remaining_amount || 0))}
                                  </Text>
                                </Space>
                              </Col>
                              <Col xs={24} md={10}>
                                <Form.Item
                                  name={["other_payments", selectionKey, "charge_id"]}
                                  initialValue={charge.charge_id}
                                  hidden
                                >
                                  <Input />
                                </Form.Item>

                                <Form.Item
                                  name={["other_payments", selectionKey, "type_id"]}
                                  initialValue={charge.type_id}
                                  hidden
                                >
                                  <Input />
                                </Form.Item>

                                <Form.Item label='Nominal Dibayar' style={{ marginBottom: 0 }}>
                                  <InputNumber
                                    {...rupiahInputProps}
                                    min={1}
                                    controls={false}
                                    value={fieldValue.amount_paid}
                                    onChange={(value) => onOtherPaymentAmountChange(charge, value)}
                                    max={Number(
                                      editingTransaction?.category === "other" &&
                                        editingTransaction?.charge_id === charge.charge_id
                                        ? editingTransaction.editable_max_amount
                                        : charge.remaining_amount || 0,
                                    )}
                                    changeOnWheel={false}
                                  />
                                </Form.Item>
                              </Col>
                            </Row>

                            <Text type='secondary'>
                              {getOtherPaymentStatusText(charge, fieldValue)}
                            </Text>
                          </Space>
                        </Card>
                      );
                    })}
                  </div>
                ) : (
                  <Text type='secondary'>
                    Tidak ada tagihan pembayaran lainnya yang masih tersisa.
                  </Text>
                )
              ) : (
                <Text type='secondary'>
                  Pilih siswa untuk melihat tagihan pembayaran lainnya yang belum lunas.
                </Text>
              )}
            </Card>
          </Col>
        </Row>

        </Form>
      </Modal>
    </>
  );
};

export default TransactionFormModal;
