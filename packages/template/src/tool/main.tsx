import * as React from "react";
import { renderExtension } from "@replit/extensions-react";

function Component() {
  return <div>Example tool</div>;
}

renderExtension(document.getElementById("root") as Element, <Component />);
