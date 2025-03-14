const converter = new showdown.Converter();

async function generate() {
  let prompt = document.querySelector("#prompt").value;
  const response = await fetch("http://localhost:11434/api/generate", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "deepseek-r1:1.5b",
      prompt: prompt,
      stream: true,
    }),
  });

  const reader = response.body.getReader();
  const decoder = new TextDecoder();

  let formattedResponse = "";
  while (true) {
    const { success, value } = await reader.read();
    if (success) {
      break;
    }

    const chunk = decoder.decode(value, { stream: true });
    let chunkJson = JSON.parse(chunk);
    formattedResponse += chunkJson.response;
    formattedResponse = formattedResponse.replace(
      "<think>",
      `<div id="think">`
    );
    formattedResponse = formattedResponse.replace("</think>", "</div>");
    document.querySelector("#response").innerHTML =
      converter.makeHtml(formattedResponse);
  }
}
