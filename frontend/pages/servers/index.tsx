import { GetServerSidePropsContext, GetServerSidePropsResult } from "next";
import useSWR from "swr";
import { map, flow, sum, filter, sortBy, reverse } from "lodash/fp";
import Link from "next/link";
import { NextSeo } from "next-seo";
import { FormEvent, useState } from "react";
import Fuse from "fuse.js";
import { toast } from "react-nextjs-toast";

const API_SERVERS = `https://index.open.mp/server/`;

interface All {
  ip: string;
  dm?: any;
  core: Essential;
  ru: Map<string, string>;
  description?: any;
  banner?: any;
  active: boolean;
}

interface Essential {
  ip: string;
  hn: string;
  pc: number;
  pm: number;
  gm: string;
  la: string;
  pa: boolean;
  vn: string;
}

type Props = {
  initialData?: Array<Essential>;
  error?: string;
};

const getServers = async (): Promise<Array<Essential>> => {
  const r: Response = await fetch(API_SERVERS);
  const servers: Array<Essential> = await r.json();
  return servers;
};

type Stats = {
  players: number;
  servers: number;
};

const getStats = (servers: Array<Essential>): Stats => ({
  players: flow(
    map((s: Essential) => s.pc), // get just the player count (pc)
    sum // sum all player counts
  )(servers),
  servers: servers.length,
});

const Row = ({ s }: { s: Essential }) => (
  <li className="hover-bg-black-10 lh-copy pa2 ph0-l bb b--black-10">
    <Link href={"/servers/" + s.ip}>
      <a className="link black flex items-center justify-between">
        <div className="pl2 overflow-hidden">
          <span className="db black-70 measure truncate">{s.hn}</span>
          <span className="db black-30 f6 measure truncate">{s.gm}</span>
        </div>

        <div className="pr2 tr dn di-ns flex-shrink-0">
          <div className="black-70">
            {s.pa ? <span>🔐</span> : null} <span>{s.ip}</span>
          </div>
          <div className="db black-30 f6 measure">
            {s.pc}/{s.pm} playing now
          </div>
        </div>
      </a>
    </Link>
  </li>
);

type SortBy = "relevance" | "pc";

type Query = {
  search?: string;
  showFull: boolean;
  showEmpty: boolean;
  sort: SortBy;
};

const dataToList = (data: Essential[], q: Query) => {
  const fuse = new Fuse(data, {
    threshold: 0.2,
    shouldSort: true,
    includeScore: true,
    ignoreLocation: true,
    keys: ["ip", "hn", "gm"],
  });

  const items = q.search
    ? map((r: Fuse.FuseResult<Essential>) => r.item)(fuse.search(q.search))
    : data;

  console.log();

  return flow(
    filter((s: Essential) => (!q.showEmpty ? s.pc > 0 : true)),
    filter((s: Essential) => (!q.showFull ? s.pc !== s.pm : true)),
    q.sort != "relevance" ? sortBy(q.sort) : sortBy(""),
    reverse,
    map((s: Essential) => <Row key={s.ip} s={s} />)
  )(items);
};

const Stats = ({ stats: { players, servers } }: { stats: Stats }) => {
  return (
    <div>
      <p>
        <span>{players}</span> players on <span>{servers}</span> servers with an
        average of <span>{(players / servers).toFixed(1)}</span> players per
        server.
      </p>
    </div>
  );
};

const formItemStyle = "pa1 ph2 flex flex-column flex-row-ns tl-ns tc";

const AddServer = () => {
  const [value, setValue] = useState("");

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const response = await fetch(API_SERVERS, {
      method: "POST",
      mode: "cors",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ ip: value }),
    });
    if (response.status === 200) {
      const server = (await response.json()) as All;
      toast.notify(
        `${server.core.hn} (${server.core.gm}) submitted to the index!`,
        {
          title: "Server Submitted!",
        }
      );
    } else {
      const error = (await response.json()) as { error: string };
      toast.notify(`Status ${response.statusText}: ${error?.error}`, {
        title: "Submission failed!",
        type: "error",
      });
    }
  };

  return (
    <form
      action={API_SERVERS}
      target="_self"
      method="post"
      className="flex flex-wrap items-center justify-center pa2 f7"
      onSubmit={handleSubmit}
    >
      <span className={formItemStyle}>
        <label className="pr2 self-center" htmlFor="address">
          Add Server:
        </label>
        <input
          className="pr2"
          type="text"
          name="address"
          placeholder="IP or Domain"
          value={value}
          onChange={(e) => setValue(e.target.value)}
        />
        <input
          className={[
            "ph3",
            "f6",
            "pointer",
            "no-underline",
            "black",
            "bg-white",
            "hover-bg-light-red",
            "hover-white",
            "inline-flex",
            "items-center",
            "pa2",
            "ba",
            "border-box",
            "mr4",
          ].join(" ")}
          type="submit"
          value="Add"
        />
      </span>
    </form>
  );
};

const List = ({ data }: { data: Array<Essential> }) => {
  const [search, setSearch] = useState("");
  const [showFull, setShowFull] = useState(false);
  const [showEmpty, setShowEmpty] = useState(false);
  const [sort, setSort] = useState("relevance");

  return (
    <>
      <Stats stats={getStats(data)} />
      <form
        action=""
        className="form flex flex-wrap items-center justify-center pa2 f7"
      >
        <span className={formItemStyle}>
          <label className="pr2 self-center" htmlFor="search">
            Filter
          </label>
          <input
            type="text"
            name="search"
            id="search"
            style={{ width: "8em" }}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
            }}
          />
        </span>

        <span className={formItemStyle}>
          <label className="pr2 self-center" htmlFor="showFull">
            Full
          </label>
          <input
            type="checkbox"
            name="showFull"
            id="showFull"
            checked={showFull}
            onChange={(e) => {
              setShowFull(e.target.checked);
            }}
          />
        </span>

        <span className={formItemStyle}>
          <label className="pr2 self-center" htmlFor="showEmpty">
            Empty
          </label>
          <input
            type="checkbox"
            name="showEmpty"
            id="showEmpty"
            checked={showEmpty}
            onChange={(e) => setShowEmpty(e.target.checked)}
          />
        </span>

        <span className={formItemStyle}>
          <label className="pr2 self-center" htmlFor="sortBy">
            Sort
          </label>
          <select
            name="sortBy"
            id="sortBy"
            value={sort}
            onChange={(e) => setSort(e.target.value)}
          >
            <option value="relevance">Relevance</option>
            <option value="pc">Players</option>
          </select>
        </span>

        {/* <span className={formItemStyle}>
          <button
            className={[
              "ph3",
              "f6",
              "pointer",
              "no-underline",
              "black",
              "bg-white",
              "hover-bg-light-red",
              "hover-white",
              "inline-flex",
              "items-center",
              "pa2",
              "ba",
              "border-box",
              "mr4",
            ].join(" ")}
            type="submit"
          >
            Apply
          </button>
        </span> */}
      </form>
      <AddServer />
      <ul className="list pl0 mt0 center">
        {dataToList(data, {
          search,
          showFull,
          showEmpty,
          sort: sort as SortBy,
        })}
      </ul>
    </>
  );
};

const Error = ({ error }: { error: TypeError }) => (
  <p>
    Unfortunately there was an error while getting the server list! The error
    message is below: <pre>{error.message}</pre>
  </p>
);

const Page = ({ initialData }: Props) => {
  const { data, error } = useSWR<Array<Essential>, TypeError>(
    API_SERVERS,
    getServers,
    {
      initialData,
    }
  );

  return (
    <section className="measure-wide center">
      <NextSeo
        title="Server List"
        description="Live indexing and data for all SA-MP servers."
      />

      <h1>Servers</h1>
      {error ? <Error error={error} /> : <List data={data} />}
    </section>
  );
};

export const getServerSideProps = async (
  _context: GetServerSidePropsContext
): Promise<GetServerSidePropsResult<Props>> => {
  return {
    props: {
      initialData: await getServers(),
    },
  };
};

export default Page;
