import React, { Suspense, useMemo } from 'react';
import { useNavigate, useParams, useLocation, Outlet, Navigate } from 'react-router-dom';
import { Button, Typography, Tabs, Grid, Divider } from 'antd';
import {
  ArrowLeftOutlined,
  BankOutlined,
  BookOutlined,
  CalculatorOutlined,
  CreditCardOutlined,
  FileTextOutlined,
  FundOutlined,
  MoneyCollectOutlined,
  SettingFilled,
  WalletOutlined,
} from '@ant-design/icons';
import { BanknoteArrowDown } from 'lucide-react';
import { LoadApp } from '../../../components';
import { FinanceScopeContext } from './FinanceScopeContext';
import { useDetailHomebaseQuery } from '../../../service/center/ApiHomebase';

const { Text } = Typography;
const { useBreakpoint } = Grid;

const TAB_ITEMS = [
  {
    key: 'pembayaran-spp',
    label: 'Pembayaran SPP',
    icon: <CreditCardOutlined />,
  },
  {
    key: 'pembayaran-lainnya',
    label: 'Pembayaran Lainnya',
    icon: <MoneyCollectOutlined />,
  },
  {
    key: 'beasiswa',
    label: 'Beasiswa',
    icon: <FundOutlined />,
  },
  {
    key: 'transaksi',
    label: 'Transaksi Keuangan',
    icon: <WalletOutlined />,
  },
  {
    key: 'laporan-tabungan',
    label: 'Tabungan Siswa',
    icon: <BookOutlined />,
  },
  {
    key: 'pengeluaran',
    label: 'Pengeluaran',
    icon: <BanknoteArrowDown size={14} />,
  },
  {
    key: 'rapbs',
    label: 'RAPBS',
    icon: <CalculatorOutlined />,
  },
  {
    key: 'laporan',
    label: 'Laporan',
    icon: <FileTextOutlined />,
  },
  {
    key: 'pengaturan',
    label: 'Pengaturan',
    icon: <SettingFilled />,
  },
];

const CenterFinanceShell = () => {
  const { homebaseId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const screens = useBreakpoint();

  const activeSection = TAB_ITEMS.find((item) =>
    location.pathname.endsWith(`/${item.key}`),
  )?.key || 'pembayaran-spp';

  const parsedHomebaseId = Number(homebaseId);

  const { data: homebaseDetailData } = useDetailHomebaseQuery(
    parsedHomebaseId
      ? { id: parsedHomebaseId, periode_id: '' }
      : undefined,
    { skip: !parsedHomebaseId },
  );

  const fetchedHomebaseName = homebaseDetailData?.data?.homebase?.name || null;

  const homebaseName =
    fetchedHomebaseName ||
    location.state?.homebaseName ||
    'Memuat nama satuan...';

  const scopeValue = useMemo(
    () => ({ homebaseId: parsedHomebaseId }),
    [parsedHomebaseId],
  );

  const handleTabChange = (key) => {
    navigate(`/keuangan/${homebaseId}/${key}`);
  };

  const handleBack = () => {
    navigate('/keuangan');
  };

  if (!parsedHomebaseId) {
    return <Navigate to='/keuangan' replace />;
  }

  const tabItems = TAB_ITEMS.map((item) => ({
    key: item.key,
    label: (
      <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        {item.icon}
        {(!screens.md ? null : item.label)}
      </span>
    ),
  }));

  return (
    <FinanceScopeContext.Provider value={scopeValue}>
      <div>
        {/* Header strip — negative margin kompensasi padding AppLayout Content */}
        <div
          style={{
            margin: screens.xs ? '-12px -12px 0' : '-24px -24px 0',
            padding: screens.md ? '12px 24px 0' : '12px 16px 0',
            background: '#fff',
            borderBottom: '1px solid #f0f0f0',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              marginBottom: 10,
            }}
          >
            <Button
              type='text'
              icon={<ArrowLeftOutlined />}
              onClick={handleBack}
              size='small'
              style={{ color: '#1677ff' }}
            >
              {screens.sm ? 'Daftar Satuan' : ''}
            </Button>

            <Divider type='vertical' style={{ margin: 0 }} />

            <BankOutlined style={{ color: '#1677ff', fontSize: 16 }} />
            <Text strong style={{ fontSize: 15 }}>
              {homebaseName}
            </Text>
          </div>

          <Tabs
            activeKey={activeSection}
            onChange={handleTabChange}
            items={tabItems}
            size='small'
            style={{ marginBottom: 0 }}
          />
        </div>

        {/* Content area */}
        <Suspense fallback={<LoadApp />}>
          <Outlet />
        </Suspense>
      </div>
    </FinanceScopeContext.Provider>
  );
};

export default CenterFinanceShell;
