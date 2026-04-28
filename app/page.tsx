import { japanesePrefectures } from "../lib/prefectures.ts";

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

const exampleAddresses = [
  {
    label: "Noda, Chiba",
    address: {
      name: "山田 太郎",
      nameKana: "ヤマダ タロウ",
      postalCode: "2780026",
      state: "千葉県",
      city: "野田市",
      addressLine1: "花井250-79",
      addressLine2: "ボンジュール荘 202"
    }
  },
  {
    label: "Kashiwa, Chiba",
    address: {
      name: "佐藤 花子",
      nameKana: "サトウ ハナコ",
      postalCode: "2770026",
      state: "千葉県",
      city: "柏市",
      addressLine1: "大塚町1-2-3",
      addressLine2: "サクラハイツ 202"
    }
  },
  {
    label: "Shinjuku, Tokyo",
    address: {
      name: "鈴木 一郎",
      nameKana: "スズキ イチロウ",
      postalCode: "1600023",
      state: "東京都",
      city: "新宿区",
      addressLine1: "西新宿6-15-1",
      addressLine2: "セントラルパークタワー・ラ・トゥール新宿 1404"
    }
  },
  {
    label: "Shibuya, Tokyo",
    address: {
      name: "高橋 美咲",
      nameKana: "タカハシ ミサキ",
      postalCode: "1500001",
      state: "東京都",
      city: "渋谷区",
      addressLine1: "神宮前3-1-5",
      addressLine2: "青山荘 305"
    }
  },
  {
    label: "Sapporo, Hokkaido",
    address: {
      name: "小林 大輔",
      nameKana: "コバヤシ ダイスケ",
      postalCode: "0640804",
      state: "北海道",
      city: "札幌市　中央区",
      addressLine1: "南四条西5-10-1",
      addressLine2: "ラ・メゾン北都 2F"
    }
  },
  {
    label: "Kushiro, Hokkaido",
    address: {
      name: "中村 葵",
      nameKana: "ナカムラ アオイ",
      postalCode: "0850836",
      state: "北海道",
      city: "釧路市",
      addressLine1: "幣舞町3-7",
      addressLine2: "リバーサイド釧路壱番館 301"
    }
  },
  {
    label: "Kanazawa, Ishikawa",
    address: {
      name: "松本 健",
      nameKana: "マツモト ケン",
      postalCode: "9200996",
      state: "石川県",
      city: "金沢市",
      addressLine1: "油車12-4",
      addressLine2: "犀川グリーンハイツ A-102"
    }
  },
  {
    label: "Kagoshima, Kagoshima",
    address: {
      name: "森 由紀",
      nameKana: "モリ ユキ",
      postalCode: "8920842",
      state: "鹿児島県",
      city: "鹿児島市",
      addressLine1: "東千石町5-12",
      addressLine2: "メゾン照国 4階"
    }
  },
  {
    label: "Naha, Okinawa",
    address: {
      name: "島袋 翔",
      nameKana: "シマブクロ ショウ",
      postalCode: "9000013",
      state: "沖縄県",
      city: "那覇市",
      addressLine1: "牧志2-16-8",
      addressLine2: "てぃーだ荘 205"
    }
  },
  {
    label: "Ishigaki, Okinawa",
    address: {
      name: "新垣 里奈",
      nameKana: "アラカキ リナ",
      postalCode: "9070012",
      state: "沖縄県",
      city: "石垣市",
      addressLine1: "美崎町8-1",
      addressLine2: "南ぬ島レジデンス 701"
    }
  }
];

function exampleHref(address: Record<string, string>) {
  const params = new URLSearchParams(address);
  return `/?${params.toString()}`;
}

export default async function HomePage({
  searchParams
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = (await searchParams) || {};
  const value = (key: string, fallback = "") => firstParam(params[key]) || fallback;

  return (
    <main className="converter-shell">
      <details className="examples-menu">
        <summary className="button link-button example-trigger">
          Example JP address auto-fill
        </summary>
        <section className="examples-panel" aria-label="Example addresses">
          <div className="example-title">Choose an example</div>
          <div className="example-list">
            {exampleAddresses.map((example) => (
              <a
                className="example-card"
                href={exampleHref(example.address)}
                key={example.label}
              >
                <strong>{example.label}</strong>
                <span>{example.address.postalCode}</span>
                <span>
                  {example.address.state} {example.address.city}
                </span>
                <span>{example.address.nameKana}</span>
                <span>{example.address.addressLine1}</span>
              </a>
            ))}
          </div>
        </section>
      </details>

      <section className="converter-card">
        <div className="form-header">
          <div>
            <div className="eyebrow">Japanese address input</div>
            <h1>UPS Latin converter</h1>
          </div>
        </div>

        <form action="/api/address-conversions/create" method="post" className="stripe-form">
          <label className="stripe-field">
            <span>氏名フリガナ</span>
            <input
              name="nameKana"
              autoComplete="off"
              placeholder="下の氏名欄のフリガナをカタカナで入力してください。"
              required
              defaultValue={value("nameKana", "ヤマモト タケシ")}
            />
          </label>

          <label className="stripe-field">
            <span>氏名</span>
            <input name="name" autoComplete="name" defaultValue={value("name")} />
          </label>

          <label className="stripe-field">
            <span>国または地域</span>
            <select name="country" defaultValue="JP">
              <option value="JP">日本</option>
            </select>
          </label>

          <label className="stripe-field">
            <span>郵便番号</span>
            <input
              name="postalCode"
              required
              inputMode="numeric"
              defaultValue={value("postalCode", "2770026")}
            />
          </label>

          <label className="stripe-field">
            <span>都道府県</span>
            <select name="state" defaultValue={value("state", "千葉県")}>
              {japanesePrefectures.map(([prefectureJa, prefectureEn]) => (
                <option key={prefectureJa} value={prefectureJa}>
                  {prefectureJa} - {prefectureEn}
                </option>
              ))}
            </select>
          </label>

          <label className="stripe-field">
            <span>都市名</span>
            <input name="city" required defaultValue={value("city", "柏市")} />
          </label>

          <label className="stripe-field">
            <span>住所（1 行目）</span>
            <input
              name="addressLine1"
              required
              placeholder="町名・番地（例：神宮前3-1-5）"
              defaultValue={value("addressLine1", "大塚町1-2-3")}
            />
          </label>

          <label className="stripe-field">
            <span>住所（2 行目）</span>
            <input
              name="addressLine2"
              placeholder="建物名・部屋番号（該当する方は必須）"
              defaultValue={value("addressLine2", "サクラハイツ 202")}
            />
          </label>

          <input name="orderId" type="hidden" value="" />

          <button className="button primary submit-button" type="submit">
            Convert to UPS Latin
          </button>
        </form>
      </section>
    </main>
  );
}
