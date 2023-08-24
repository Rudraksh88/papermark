import { NextApiRequest, NextApiResponse } from 'next';
import {
  getConfigResponse,
  getDomainResponse,
  verifyDomain,
} from "@/lib/domains";
import { DomainVerificationStatusProps } from "@/lib/types";

export default async function handle(req: NextApiRequest, res: NextApiResponse) {
  // GET /api/domains/[slug]/verify - get domain verification status
  if (req.method === "GET") {
    const { slug: domain } = req.query as { slug: string; };
    let status: DomainVerificationStatusProps = "Valid Configuration";

    const [domainJson, configJson] = await Promise.all([
      getDomainResponse(domain),
      getConfigResponse(domain),
    ]);

    if (domainJson?.error?.code === "not_found") {
      // domain not found on Vercel project
      status = "Domain Not Found";

      // unknown error
    } else if (domainJson.error) {
      status = "Unknown Error";

      // if domain is not verified, we try to verify now
    } else if (!domainJson.verified) {
      status = "Pending Verification";
      const verificationJson = await verifyDomain(domain);

      // domain was just verified
      if (verificationJson && verificationJson.verified) {
        status = "Valid Configuration";
      }
    } else if (configJson.misconfigured) {
      status = "Invalid Configuration";
    } else {
      status = "Valid Configuration";
    }

    return res.status(200).json({
      status,
      domainJson,
    });
  } else {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}