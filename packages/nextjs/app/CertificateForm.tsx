"use client";

import { useRef, useState } from "react";
import type { Hex } from "viem";
import { useAccount, useConnect, usePublicClient, useReadContract, useSwitchChain, useWriteContract } from "wagmi";
import deployments from "../contracts/deployedContracts";
import { pdfHash } from "./pdfHash";

const chainId = 31337;
const registry = { ...deployments[chainId].CertificateRegistry, chainId };
const labels = ["Не зарегистрирован", "Действителен", "Отозван"] as const;

function message(error: unknown) {
  if (error && typeof error === "object" && "shortMessage" in error) return String(error.shortMessage);
  return error instanceof Error ? error.message : "Не удалось выполнить операцию.";
}

export function CertificateForm({ manage = false }: { manage?: boolean }) {
  const [hash, setHash] = useState<Hex>();
  const [notice, setNotice] = useState("");
  const [tx, setTx] = useState<Hex>();
  const [busy, setBusy] = useState(false);
  const selection = useRef(0);
  const { address, chainId: walletChain } = useAccount();
  const connect = useConnect();
  const network = useSwitchChain();
  const client = usePublicClient({ chainId });
  const writer = useWriteContract();
  const teacher = useReadContract({ ...registry, functionName: "teacher", query: { enabled: manage } });
  const status = useReadContract({
    ...registry, functionName: "getStatus", args: hash ? [hash] : undefined,
    query: { enabled: !!hash, refetchInterval: 3000, retry: 1 },
  });
  const authorized = !!address && walletChain === chainId && address.toLowerCase() === teacher.data?.toLowerCase();

  async function select(file?: File) {
    const current = ++selection.current;
    setHash(undefined);
    setTx(undefined);
    setNotice(file ? "Вычисляем SHA-256…" : "");
    if (!file) return;
    try {
      const result = await pdfHash(file);
      if (selection.current === current) { setHash(result); setNotice(""); }
    } catch (error) {
      if (selection.current === current) setNotice(message(error));
    }
  }

  async function submit(action: "issueCertificate" | "revokeCertificate") {
    if (!authorized || !hash || busy || !client) return;
    setBusy(true);
    setTx(undefined);
    setNotice("Ожидаем подпись в MetaMask…");
    try {
      const transaction = await writer.writeContractAsync({ ...registry, functionName: action, args: [hash] });
      setTx(transaction);
      setNotice("Транзакция отправлена. Ожидаем подтверждение…");
      const receipt = await client.waitForTransactionReceipt({ hash: transaction });
      if (receipt.status !== "success") throw new Error("Контракт отклонил транзакцию.");
      const result = await status.refetch();
      setNotice(result.isError ? "Транзакция подтверждена. Ошибка повторного чтения статуса." :
        action === "issueCertificate" ? "Сертификат выдан. Транзакция подтверждена." : "Сертификат отозван. Транзакция подтверждена.");
    } catch (error) {
      setNotice("Ошибка транзакции. " + message(error));
    } finally {
      setBusy(false);
    }
  }

  return <>
    <h1>{manage ? "Выдача и отзыв" : "Проверка сертификата"}</h1>
    <p className="intro">{manage ? "Подключите кошелёк преподавателя и выберите PDF сертификата." :
      "Выберите PDF сертификата курса. Для проверки кошелёк не требуется."}</p>
    {manage && <section><h2>Кошелёк преподавателя</h2>
      <p>Адрес преподавателя <code>{teacher.isError ? "Ошибка чтения" : teacher.data ?? "Загрузка…"}</code></p>
      {!address ? <button disabled={connect.isPending} onClick={() => connect.connect({ connector: connect.connectors[0] })}>
        {connect.isPending ? "Ожидаем MetaMask…" : "Подключить MetaMask"}</button> :
        <><p>Подключён <code>{address}</code></p>{walletChain !== chainId ?
          <button onClick={() => network.switchChain({ chainId })}>Переключиться на Hardhat 31337</button> :
          teacher.data && !authorized && <p>Для записи выберите в MetaMask адрес преподавателя.</p>}</>}
      {(connect.error || network.error) && <p role="alert">{message(connect.error || network.error)}</p>}
    </section>}
    <section><h2><label htmlFor="certificate">Файл сертификата</label></h2>
      <input id="certificate" type="file" accept=".pdf,application/pdf" disabled={busy}
        onChange={event => void select(event.target.files?.[0])} />
      <p className="hint">Файл остаётся в браузере. В реестре хранится только его хеш.</p>
      {hash && <><div className="result"><small>Статус в реестре</small>
        <strong aria-live="polite">{status.isError ? "Ошибка чтения статуса" : status.data === undefined ? "Проверяем…" : labels[status.data]}</strong>
        </div><small>SHA-256</small><code>{hash}</code></>}
      {manage && <><div className="actions">
        <button disabled={!authorized || !hash || busy || status.isError || status.data !== 0} onClick={() => void submit("issueCertificate")}>Выдать сертификат</button>
        <button className="secondary" disabled={!authorized || !hash || busy || status.isError || status.data !== 1} onClick={() => void submit("revokeCertificate")}>Отозвать</button>
      </div><p className="hint">Отзыв окончательный. Повторная выдача того же PDF невозможна.</p></>}
      <output aria-live="polite">{notice}</output>
      {tx && <p>Хеш транзакции <code>{tx}</code></p>}
    </section>
  </>;
}
