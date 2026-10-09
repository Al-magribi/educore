import { useEffect, useMemo, useState } from 'react';
import { Alert, Button, Card, Col, Flex, Row, Select, Space, Spin, Statistic, Typography } from 'antd';
import { ArrowLeftOutlined, BankOutlined } from '@ant-design/icons';
import { Calculator } from 'lucide-react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';

import { useGetBudgetsQuery, useGetReportOptionsQuery } from '../../../service/finance/ApiReport';
import ReportBudgetTab from '../report/components/ReportBudgetTab';
import { cardStyle, currencyFormatter, pageStyle } from '../report/constants';

const { Title, Text } = Typography;

const RapbsDetail = ({ listPath = '/finance/rapbs', showBack = true, scopedHomebaseId }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams();
  const homebaseId = Number(scopedHomebaseId || params.homebaseId || params.id);

  const [periodeId, setPeriodeId] = useState();

  const {
    data: optionsResponse,
    isLoading: isLoadingOptions,
    isError: isOptionsError,
  } = useGetReportOptionsQuery(homebaseId ? { homebase_id: homebaseId } : undefined, { skip: !homebaseId });

  const options = optionsResponse?.data;
  const periodes = options?.periodes || [];
  const homebaseName = options?.homebase?.name || location.state?.homebaseName || 'Satuan pendidikan';

  useEffect(() => {
    if (!options) return;
    setPeriodeId((prev) => prev || options.default_periode_id);
  }, [options]);

  const {
    data: budgetResponse,
    isFetching: isFetchingBudgets,
    isError: isBudgetError,
    error: budgetError,
  } = useGetBudgetsQuery(homebaseId && periodeId ? { homebase_id: homebaseId, periode_id: periodeId } : undefined, {
    skip: !homebaseId || !periodeId,
  });

  const budgetData = budgetResponse?.data;
  const items = budgetData?.items || [];
  const totals = budgetData?.totals || {};

  const summaryCards = useMemo(
    () => [
      {
        key: 'income_budget',
        title: 'Anggaran Pendapatan',
        value: totals.income_budget || 0,
      },
      {
        key: 'income_realized',
        title: 'Realisasi Pendapatan',
        value: totals.income_realized || 0,
      },
      {
        key: 'expense_budget',
        title: 'Anggaran Pengeluaran',
        value: totals.expense_budget || 0,
      },
      {
        key: 'expense_realized',
        title: 'Realisasi Pengeluaran',
        value: totals.expense_realized || 0,
      },
    ],
    [totals],
  );

  if (!homebaseId) {
    return (
      <div style={pageStyle}>
        <Alert
          type="error"
          showIcon
          message="Homebase tidak valid"
          action={<Button onClick={() => navigate(listPath)}>Kembali</Button>}
        />
      </div>
    );
  }

  if (isLoadingOptions) {
    return (
      <div style={{ ...pageStyle, textAlign: 'center', paddingTop: 64 }}>
        <Spin size="large" />
      </div>
    );
  }

  if (isOptionsError) {
    return (
      <div style={pageStyle}>
        <Alert
          type="error"
          showIcon
          message="Gagal memuat opsi RAPBS"
          action={showBack ? <Button onClick={() => navigate(listPath)}>Kembali</Button> : null}
        />
      </div>
    );
  }

  return (
    <>
      <Space direction="vertical" size={18} style={{ width: '100%' }}>
        <Flex align="flex-start" justify="space-between" gap={12} wrap="wrap">
          <div>
            {showBack ? (
              <Button
                type="link"
                icon={<ArrowLeftOutlined />}
                onClick={() => navigate(listPath)}
                style={{ paddingInline: 0, marginBottom: 4 }}>
                Daftar satuan
              </Button>
            ) : null}
            <Flex align="center" gap={10}>
              <Calculator style={{ color: '#1677ff' }} size={22} />
              <div>
                <Title level={4} style={{ margin: 0 }}>
                  RAPBS / Anggaran
                </Title>
                <Text type="secondary">
                  <BankOutlined style={{ marginRight: 6 }} />
                  {homebaseName}
                </Text>
              </div>
            </Flex>
          </div>

          <Select
            style={{ minWidth: 260 }}
            placeholder="Pilih periode"
            value={periodeId}
            options={periodes.map((item) => ({
              value: item.id,
              label: `${item.name}${item.is_active ? ' (Aktif)' : ''}`,
            }))}
            onChange={setPeriodeId}
            showSearch
            optionFilterProp="label"
          />
        </Flex>

        <Alert
          type="info"
          showIcon
          message="Kelola anggaran per periode ajaran"
          description="Pos pengeluaran RAPBS mengikuti kategori di menu Pengeluaran → Kategori. Hanya admin keuangan dan pusat yang dapat mengubah nominal maupun kategori."
        />

        {isBudgetError ? (
          <Alert type="error" showIcon message={budgetError?.data?.message || 'Gagal memuat data anggaran RAPBS'} />
        ) : null}

        {isFetchingBudgets && !budgetData ? (
          <div style={{ textAlign: 'center', padding: 48 }}>
            <Spin size="large" />
          </div>
        ) : (
          <>
            <Row gutter={[16, 16]}>
              {summaryCards.map((item) => (
                <Col xs={24} sm={12} xl={6} key={item.key}>
                  <Card style={cardStyle} styles={{ body: { padding: 18 } }}>
                    <Statistic
                      title={item.title}
                      value={item.value}
                      formatter={(value) => currencyFormatter.format(value)}
                    />
                  </Card>
                </Col>
              ))}
            </Row>

            <Card style={cardStyle} styles={{ body: { padding: 20 } }}>
              <ReportBudgetTab homebaseId={homebaseId} periodeId={periodeId} items={items} readOnly={false} />
            </Card>
          </>
        )}
      </Space>
    </>
  );
};

export default RapbsDetail;
