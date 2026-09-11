import parseHttpRequest from "bittorrent-tracker/lib/server/parse-http.js";
import bencode from "bencode";
import handleAnnounce from "./announce.js";
import pluginEvents from "../plugins/eventBus.js";

const createTrackerRoute = (action, onRequest) => async (req, res) => {
  let announceContext;
  if (action === "announce") {
    try {
      announceContext = await handleAnnounce(req, res);
    } catch (err) {
      console.error("[sq] error handling announce:", err.message);
      if (!res.writableEnded) {
        res.end(
          bencode.encode({
            "failure reason": "Announce failed: tracker error.",
          }),
        );
      }
      return;
    }
    if (res.writableEnded) return;
  }

  // bittorrent-tracker will only parse a single IP in x-forwarded-for, and will
  // fail if it includes a comma-separated list
  if (req.headers["x-forwarded-for"]) {
    req.headers["x-forwarded-for"] =
      req.headers["x-forwarded-for"].split(",")[0];
  }

  let params;
  try {
    params = parseHttpRequest(req, { action, trustProxy: true });
    params.httpReq = req;
    params.httpRes = res;
  } catch (err) {
    res.end(
      bencode.encode({
        "failure reason": err.message,
      }),
    );
    return;
  }
  onRequest(params, (err, response) => {
    let finalResponse = response;
    if (err) {
      finalResponse = {
        "failure reason": err.message,
      };
    } else {
      delete finalResponse.action;
      if (action === "announce") {
        finalResponse["interval"] = 30;
        finalResponse["min interval"] = 30;
        pluginEvents.emitDetached(
          "tracker.announce.accepted",
          {
            infoHash: params.info_hash,
            event: params.event,
            left: params.left,
            seeders: Number(response.complete) || 0,
            leechers: Number(response.incomplete) || 0,
          },
          announceContext?.actor ?? null,
        );
      }
    }
    res.end(bencode.encode(finalResponse));
  });
};

export default createTrackerRoute;
