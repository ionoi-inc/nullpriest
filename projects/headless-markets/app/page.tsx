export default function Home() {
  return (
    <main style={{minHeight:"100vh",background:"#000",color:"#e8e8e8",fontFamily:"IBM Plex Mono, monospace"}}>
      <nav style={{position:"fixed",top:0,left:0,right:0,height:"44px",background:"rgba(0,0,0,0.95)",borderBottom:"1px solid rgba(255,255,255,0.1)",display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0 32px",zIndex:50}}>
        <a href="/" style={{fontSize:"13px",fontWeight:500,color:"#e8e8e8",textDecoration:"none"}}>headless<span style={{color:"#00ff88"}}>.</span>markets</a>
        <div style={{display:"flex",gap:"24px",fontSize:"11px",color:"rgba(255,255,255,0.4)"}}>
          <a href="/docs/architecture" style={{color:"inherit",textDecoration:"none"}}>docs</a>
          <a href="https://nullpriest.xyz" style={{color:"inherit",textDecoration:"none"}}>nullpriest.xyz</a>
          <a href="https://x.com/nullPriest_" style={{color:"inherit",textDecoration:"none"}}>@nullPriest_</a>
        </div>
      </nav>
      <section style={{paddingTop:"176px",paddingBottom:"128px",textAlign:"center",padding:"176px 32px 128px"}}>
        <div style={{display:"inline-block",fontSize:"10px",color:"rgba(0,255,136,0.8)",border:"1px solid rgba(0,255,136,0.2)",borderRadius:"4px",padding:"4px 12px",marginBottom:"32px",letterSpacing:"0.1em",textTransform:"uppercase"}}>building on base</div>
        <h1 style={{fontSize:"80px",fontWeight:500,lineHeight:1,letterSpacing:"-0.03em",marginBottom:"32px",color:"#fff"}}>YC for<br/><span style={{color:"#00ff88"}}>AI agents</span></h1>
        <p style={{fontSize:"17px",color:"rgba(255,255,255,0.4)",maxWidth:"560px",margin:"0 auto 48px",lineHeight:1.7}}>Launch your agent token in 60 seconds. Bonding curve raises. Quorum-gated graduation. 10% protocol fee to $NULP holders.</p>
        <div style={{display:"flex",gap:"16px",justifyContent:"center",flexWrap:"wrap"}}>
          <a href="/docs/architecture" style={{padding:"12px 24px",background:"#00ff88",color:"#000",fontSize:"13px",fontWeight:500,borderRadius:"8px",textDecoration:"none"}}>Read the Architecture</a>
          <a href="https://x.com/nullPriest_" style={{padding:"12px 24px",border:"1px solid rgba(255,255,255,0.2)",color:"rgba(255,255,255,0.6)",fontSize:"13px",borderRadius:"8px",textDecoration:"none"}}>Follow for Updates</a>
        </div>
      </section>
      <section style={{padding:"96px 32px",borderTop:"1px solid rgba(255,255,255,0.1)"}}>
        <div style={{maxWidth:"960px",margin:"0 auto"}}>
          <div style={{fontSize:"10px",color:"rgba(255,255,255,0.3)",letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:"48px"}}>How It Works</div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:"32px"}}>
            {[["01","List Your Agent","Submit token metadata and set your bonding curve parameters. No whitelist. No gatekeepers."],["02","Bonding Curve Opens","Early supporters buy in. At 30% fill, a quorum vote triggers. Bad agents get filtered out."],["03","Graduate to Market","60% to Uniswap v3 liquidity. 30% to agent treasury. 10% protocol fee to $NULP holders."]].map(([step,title,desc])=>(
              <div key={step} style={{border:"1px solid rgba(255,255,255,0.1)",borderRadius:"8px",padding:"24px"}}>
                <div style={{fontSize:"11px",color:"rgba(0,255,136,0.6)",marginBottom:"16px"}}>{step}</div>
                <div style={{fontSize:"13px",fontWeight:500,marginBottom:"12px"}}>{title}</div>
                <div style={{fontSize:"11px",color:"rgba(255,255,255,0.4)",lineHeight:1.6}}>{desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>
      <section style={{padding:"96px 32px",borderTop:"1px solid rgba(255,255,255,0.1)",background:"rgba(255,255,255,0.02)"}}>
        <div style={{maxWidth:"960px",margin:"0 auto"}}>
          <div style={{fontSize:"10px",color:"rgba(255,255,255,0.3)",letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:"48px"}}>Fee Structure</div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:"24px",textAlign:"center"}}>
            {[["60%","Liquidity Pool","Uniswap v3 on Base"],["30%","Agent Treasury","Controlled by agent"],["10%","Protocol Fee","Distributed to $NULP"]].map(([pct,label,sub])=>(
              <div key={pct} style={{padding:"32px 0"}}>
                <div style={{fontSize:"48px",fontWeight:500,color:"#00ff88",marginBottom:"8px"}}>{pct}</div>
                <div style={{fontSize:"13px",marginBottom:"4px"}}>{label}</div>
                <div style={{fontSize:"11px",color:"rgba(255,255,255,0.3)"}}>{sub}</div>
              </div>
            ))}
          </div>
        </div>
      </section>
      <section style={{padding:"96px 32px",borderTop:"1px solid rgba(255,255,255,0.1)"}}>
        <div style={{maxWidth:"960px",margin:"0 auto",display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:"32px"}}>
          <div>
            <div style={{fontSize:"10px",color:"rgba(255,255,255,0.3)",letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:"16px"}}>Status</div>
            <div style={{display:"flex",alignItems:"center",gap:"12px"}}>
              <div style={{width:"8px",height:"8px",borderRadius:"50%",background:"#ffcc00"}}></div>
              <span style={{fontSize:"13px",color:"rgba(255,255,255,0.6)"}}>Building - contracts in development</span>
            </div>
          </div>
          <a href="https://nullpriest.xyz" style={{fontSize:"11px",color:"rgba(255,255,255,0.3)",textDecoration:"none"}}>A nullpriest project</a>
        </div>
      </section>
    </main>
  );
}