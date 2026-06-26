async function test() {
  const url = "https://vietlott.vn/ajaxpro/Vietlott.PlugIn.WebParts.GameBingoCompareWebPart,Vietlott.PlugIn.WebParts.ashx";
  const methods = [
    "GetBingoCompareWebPart",
    "Search",
    "Compare",
    "GetResult",
    "CompareBingo"
  ];

  for (const m of methods) {
    console.log(`\n--- Testing X-AjaxPro-Method: ${m} ---`);
    const body = {
      ORenderInfo: {
        UserControlClassName: "Vietlott.PlugIn.WebParts.GameBingoCompareWebPart",
        ObjectId: "",
        ObjectName: "",
        ObjectValue: "",
        PropertyName: "",
        PropertyValue: ""
      },
      GameId: "8",
      GameDrawNo: "",
      number: "",
      DrawDate: "",
      PageIndex: 1,
      TotalRow: 100
    };

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "text/plain; charset=UTF-8",
          "X-AjaxPro-Method": m,
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        },
        body: JSON.stringify(body)
      });

      console.log(`Status: ${response.status}`);
      const text = await response.text();
      console.log(`Response preview (150 chars): ${text.substring(0, 300)}`);
    } catch (e) {
      console.error(`Error with ${m}:`, e.message);
    }
  }
}

test();
