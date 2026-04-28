import { japanesePrefectures } from "../lib/prefectures.ts";

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

const exampleAddresses = [
  {
    label: "Noda, Chiba",
    address: {
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
      postalCode: "1500001",
      state: "東京都",
      city: "渋谷区",
      addressLine1: "神宮前3-1-5",
      addressLine2: "青山荘 305"
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
        <summary className="button link-button example-trigger">Example auto-fill</summary>
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
              defaultValue={value("nameKana")}
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
