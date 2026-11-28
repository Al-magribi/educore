import { BookOpenText, Layers2 } from "lucide-react";

import { PageTabs } from "../../../../components/ui/muse";
import { useGetJuzListQuery, useGetSurahListQuery } from "../../../../service/tahfiz/ApiAlquran";
import Juz from "./Juz";
import Surah from "./Surah";

const ensureArray = (value) => (Array.isArray(value) ? value : []);
const formatNumber = (value) => Number(value || 0).toLocaleString("id-ID");

const Alquran = () => {
  const surahQuery = useGetSurahListQuery();
  const juzQuery = useGetJuzListQuery();
  const surahData = ensureArray(surahQuery.data);
  const juzData = ensureArray(juzQuery.data);

  const totalAyat = surahData.reduce(
    (accumulator, surah) => accumulator + (surah.number_of_verses || 0),
    0,
  );

  const description = surahData.length
    ? `${formatNumber(surahData.length)} surah · ${formatNumber(juzData.length)} juz · ${formatNumber(totalAyat)} ayat. Data acuan untuk target dan setoran hafalan.`
    : "Data surah dan juz sebagai acuan target dan setoran hafalan.";

  return (
    <PageTabs
      title="Referensi Al-Qur'an"
      description={description}
      items={[
        {
          key: "surah",
          label: "Surah",
          icon: <BookOpenText />,
          render: () => (
            <Surah
              data={surahData}
              isLoading={surahQuery.isLoading}
              isFetching={surahQuery.isFetching}
              isError={surahQuery.isError}
              refetch={surahQuery.refetch}
            />
          ),
        },
        {
          key: "juz",
          label: "Juz",
          icon: <Layers2 />,
          render: () => (
            <Juz
              data={juzData}
              isLoading={juzQuery.isLoading}
              isFetching={juzQuery.isFetching}
              isError={juzQuery.isError}
              refetch={juzQuery.refetch}
            />
          ),
        },
      ]}
    />
  );
};

export default Alquran;
