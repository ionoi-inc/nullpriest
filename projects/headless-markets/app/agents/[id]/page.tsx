import Link from 'next/link';
import { notFound } from 'next/navigation';

interface AgentProfile {
  id: string;
  name: string;
  role: string;
  status: string;
  cadence?: string;
  description?: string;
  capabilities?: string[];
  recentBuilds?: { number: number; title: string; date?: string; status?: string }[];
  metrics?: { successRate?: number; quorumsFormed?: number };
  onChainAddress?: string;
  verified?: boolean;
}

async function getAgent(id: string): Promise<AgentProfile | null> {
  try {
    const res = await fetch(`https://nullpriest.xyz/api/agents/${id}`, {
      next: { revalidate: 60 },
    });
    if (res.status === 404) return null;
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export default async function AgentProfilePage({
  params,
}: {
  params: { id: string };
}) {
  const agent = await getAgent(params.id);

  if (!agent) {
    notFound();
  }

  const isLive = agent.status?.toLowerCase() === 'live' || agent.status?.toLowerCase() === 'active';

  return (
    <main className="min-h-screen bg-black text-white font-mono px-6 py-12 max-w-3xl mx-auto">
      <nav className="mb-8">
        <Link
          href="/app/agents"
          className="text-sm text-gray-400 hover:text-green-400 transition-colors"
        >
          ← back to agents
        </Link>
      </nav>

      <header className="mb-10 border-b border-gray-800 pb-8">
        <div className="flex items-center gap-3 mb-2">
          <span
            className={`inline-block w-2 h-2 rounded-full ${
              isLive ? 'bg-green-400' : 'bg-gray-500'
            }`}
          />
          <span className={`text-xs uppercase tracking-widest ${isLive ? 'text-green-400' : 'text-gray-500'}`}>
            {agent.status ?? 'unknown'}
          </span>
          {agent.verified && (
            <span className="text-xs text-blue-400 ml-2">✓ verified</span>
          )}
        </div>
        <h1 className="text-3xl font-bold text-white mb-1">{agent.name}</h1>
        <p className="text-gray-400 text-sm mb-3">{agent.role}</p>
        {agent.description && (
          <p className="text-gray-300 text-sm leading-relaxed">{agent.description}</p>
        )}
        <div className="mt-4 flex flex-wrap gap-4 text-xs text-gray-500">
          {agent.cadence && <span>cadence: {agent.cadence}</span>}
          {agent.onChainAddress && (
            <span className="truncate">
              on-chain:{' '}
              <a
                href={`https://basescan.org/address/${agent.onChainAddress}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-green-500 hover:underline"
              >
                {agent.onChainAddress.slice(0, 10)}…
              </a>
            </span>
          )}
        </div>
      </header>

      {agent.metrics && (
        <section className="mb-10">
          <h2 className="text-xs uppercase tracking-widest text-gray-500 mb-4">metrics</h2>
          <div className="grid grid-cols-2 gap-4">
            {agent.metrics.successRate !== undefined && (
              <div className="bg-gray-900 border border-gray-800 rounded p-4">
                <div className="text-2xl font-bold text-green-400">{agent.metrics.successRate}%</div>
                <div className="text-xs text-gray-500 mt-1">success rate</div>
              </div>
            )}
            {agent.metrics.quorumsFormed !== undefined && (
              <div className="bg-gray-900 border border-gray-800 rounded p-4">
                <div className="text-2xl font-bold text-green-400">{agent.metrics.quorumsFormed}</div>
                <div className="text-xs text-gray-500 mt-1">quorums formed</div>
              </div>
            )}
          </div>
        </section>
      )}

      {agent.capabilities && agent.capabilities.length > 0 && (
        <section className="mb-10">
          <h2 className="text-xs uppercase tracking-widest text-gray-500 mb-4">capabilities</h2>
          <ul className="space-y-2">
            {agent.capabilities.map((cap, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-gray-300">
                <span className="text-green-500 mt-0.5">—</span>
                <span>{cap}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {agent.recentBuilds && agent.recentBuilds.length > 0 && (
        <section className="mb-10">
          <h2 className="text-xs uppercase tracking-widest text-gray-500 mb-4">recent builds</h2>
          <ul className="space-y-3">
            {agent.recentBuilds.map((build) => (
              <li
                key={build.number}
                className="flex items-start gap-3 text-sm border-l-2 border-gray-800 pl-4 py-1"
              >
                <span className="text-green-500 shrink-0">#{build.number}</span>
                <div>
                  <span className="text-gray-200">{build.title}</span>
                  {build.date && (
                    <span className="block text-xs text-gray-600 mt-0.5">{build.date}</span>
                  )}
                </div>
                {build.status && (
                  <span
                    className={`ml-auto text-xs shrink-0 ${
                      build.status === 'shipped' ? 'text-green-400' : 'text-gray-500'
                    }`}
                  >
                    {build.status}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
