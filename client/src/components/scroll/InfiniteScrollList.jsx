import React, { useEffect, useRef } from "react";
import { Spin, Empty, Row, Col, Divider } from "antd";

const InfiniteScrollList = ({
  data = [],
  loading = false,
  hasMore = false,
  onLoadMore = () => {},
  renderItem,
  height = "75vh",
  emptyText = "Tidak ada data",
  grid = { gutter: [16, 16], xs: 24, sm: 24, md: 12, lg: 8, xl: 6, xxl: 6 },
}) => {
  // Ref untuk elemen penanda (sentinel) di paling bawah
  const observerTarget = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        // entries[0] adalah elemen yang kita pantau
        if (entries[0].isIntersecting) {
          // Cek: Jika elemen terlihat, TIDAK sedang loading, dan MASIH ada data
          if (!loading && hasMore) {
            onLoadMore();
          }
        }
      },
      {
        threshold: 0.1, // Trigger saat 10% elemen target masuk viewport
        root: null, // Mengacu pada viewport browser (atau parent scrollable)
      },
    );

    // Mulai memantau elemen target jika ada
    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    // Cleanup: Matikan pemantauan saat komponen unmount atau dependencies berubah
    return () => {
      if (observerTarget.current) {
        // eslint-disable-next-line react-hooks/exhaustive-deps
        observer.unobserve(observerTarget.current);
      }
    };
  }, [loading, hasMore, onLoadMore]); // Re-run effect jika status loading/hasMore berubah

  return (
    <div
      style={{
        padding: "4px",
        position: "relative", // Penting untuk konteks scrolling
      }}
    >
      {/* KONDISI 1: Data Kosong & Tidak Loading */}
      {data.length === 0 && !loading ? (
        <div style={{ padding: "40px 0" }}>
          <Empty description={emptyText} />
        </div>
      ) : (
        /* KONDISI 2: Render Grid Data */
        <Row gutter={grid.gutter}>
          {data.map((item, index) => (
            <Col
              key={item.id || index}
              xs={grid.xs}
              sm={grid.sm}
              md={grid.md}
              lg={grid.lg}
              xl={grid.xl}
              xxl={grid.xxl}
            >
              {renderItem(item)}
            </Col>
          ))}
        </Row>
      )}

      {/* ELEMENT PEMANTAU (SENTINEL)
         Elemen div kosong ini diletakkan di paling bawah.
         Invisible, tapi dipantau oleh IntersectionObserver.
      */}
      <div
        ref={observerTarget}
        style={{ height: "20px", width: "100%", background: "transparent" }}
      />

      {/* KONDISI 3: Loading Indicator */}
      {loading && (
        <div
          style={{
            textAlign: "center",
            padding: "10px 0",
            width: "100%",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            gap: "8px",
            color: "#1890ff",
          }}
        >
          <Spin />
          <span>Memuat data...</span>
        </div>
      )}

      {/* KONDISI 4: End of List */}
      {!hasMore && data.length > 0 && (
        <Divider
          style={{ color: "#999", fontSize: "12px", margin: "10px 0 20px 0" }}
        >
          Semua data telah dimuat
        </Divider>
      )}
    </div>
  );
};

export default InfiniteScrollList;
