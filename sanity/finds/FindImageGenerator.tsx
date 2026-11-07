'use client';

import { useEffect, useState } from 'react';
import { Card } from '@sanity/ui';
import { useClient, useFormValue } from 'sanity';

type ModelChoice = { _id: string; name: string };
type ProductChoice = {
  _key: string;
  alt?: string;
  sourceKind?: string;
  approvalStatus?: string;
  aiReferenceAuthorized?: boolean;
  aiReferenceRights?: string;
};
type Preview = {
  dataUrl: string;
  ticket: string;
  alt: string;
  status: 'pending' | 'approved' | 'rejected';
};

export function FindImageGenerator() {
  const client = useClient({ apiVersion: '2026-10-01' });
  const id = useFormValue(['_id']) as string | undefined;
  const images = (useFormValue(['productImages']) || []) as ProductChoice[];
  const [models, setModels] = useState<ModelChoice[]>([]);
  const [modelId, setModelId] = useState('');
  const [productImageKey, setProductImageKey] = useState('');
  const [styling, setStyling] = useState('');
  const [count, setCount] = useState(1);
  const [sessionToken, setSessionToken] = useState('');
  const [selectedName, setSelectedName] = useState('');
  const [previews, setPreviews] = useState<Preview[]>([]);
  const [pending, setPending] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    let live = true;
    client
      .fetch<ModelChoice[]>(
        '*[_type == "aiFashionModel" && !(_id in path("drafts.**")) && active == true && referenceImageApproval == "approved"]{_id,name}',
      )
      .then((items) => {
        if (live) setModels(items);
      })
      .catch(() => {
        if (live) setError('Could not load active models.');
      });
    return () => {
      live = false;
    };
  }, [client]);

  const choices = images.filter(
    (image) =>
      image._key &&
      image.approvalStatus === 'approved' &&
      ['original', 'licensed'].includes(image.sourceKind || '') &&
      image.aiReferenceAuthorized === true &&
      Boolean(image.aiReferenceRights?.trim()),
  );

  async function call(body: object) {
    const token = client.config().token;
    if (!token) throw new Error('Sign in to Sanity Studio with an editor token before generating.');
    const response = await fetch('/api/studio/find-image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
      cache: 'no-store',
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Image request failed.');
    return data;
  }

  async function generate(retry = false) {
    setError('');
    setStatus('');
    setPending(true);
    try {
      const result = await call(
        retry
          ? { action: 'generate', sessionToken }
          : {
              action: 'generate',
              findId: id,
              modelId: modelId || undefined,
              productImageKey,
              styling,
              count,
            },
      );
      setSessionToken(result.sessionToken);
      setSelectedName(result.modelName || result.modelId);
      setPreviews(
        result.previews.map((preview: { dataUrl: string; ticket: string }) => ({
          ...preview,
          alt: '',
          status: 'pending' as const,
        })),
      );
      setStatus(
        `Generated ${result.previews.length} private preview${result.previews.length === 1 ? '' : 's'} with ${result.modelName || 'the selected model'}. Review before approving.`,
      );
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Generation failed.');
    } finally {
      setPending(false);
    }
  }

  async function approve(index: number) {
    const preview = previews[index];
    setError('');
    setPending(true);
    try {
      const result = await call({
        action: 'approve',
        ticket: preview.ticket,
        imageBase64: preview.dataUrl.split(',')[1],
        alt: preview.alt,
      });
      setPreviews((current) =>
        current.map((item, position) =>
          position === index ? { ...item, status: 'approved' } : item,
        ),
      );
      setStatus(
        `Approved image added to the Find draft as an editorial styling concept (${result.assetId}). Refresh the editor to see it. It was not published or selected automatically.`,
      );
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Approval failed.');
    } finally {
      setPending(false);
    }
  }

  function reset() {
    setSessionToken('');
    setSelectedName('');
    setPreviews([]);
    setStatus('');
    setError('');
  }

  return (
    <Card border padding={4}>
      <section aria-labelledby="find-ai-generator-heading" style={{ display: 'grid', gap: 12 }}>
        <h2 id="find-ai-generator-heading">AI styling concept</h2>
        <p>
          Save the Find and an approved product photograph first. Generation sends the approved
          model and product references to OpenAI. Previews stay only in this browser tab until you
          approve one.
        </p>
        <label htmlFor="find-ai-model">Fashion model</label>
        <select
          id="find-ai-model"
          value={modelId}
          disabled={pending || Boolean(sessionToken)}
          onChange={(event) => setModelId(event.target.value)}
        >
          <option value="">Choose randomly from eligible models</option>
          {models.map((model) => (
            <option key={model._id} value={model._id}>
              {model.name}
            </option>
          ))}
        </select>
        <label htmlFor="find-ai-product-reference">Authorized product reference</label>
        <select
          id="find-ai-product-reference"
          value={productImageKey}
          disabled={pending || Boolean(sessionToken)}
          onChange={(event) => setProductImageKey(event.target.value)}
        >
          <option value="">Choose an approved product photo</option>
          {choices.map((image) => (
            <option key={image._key} value={image._key}>
              {image.alt || image._key}
            </option>
          ))}
        </select>
        {!choices.length && (
          <p role="status">
            In Product photographs, approve a photo, check its AI-reference authorization, and
            record usage rights. Save the Find before generating.
          </p>
        )}
        <label htmlFor="find-ai-styling">Styling instructions</label>
        <textarea
          id="find-ai-styling"
          rows={4}
          minLength={10}
          maxLength={800}
          value={styling}
          disabled={pending || Boolean(sessionToken)}
          onChange={(event) => setStyling(event.target.value)}
        />
        <label htmlFor="find-ai-count">Variations</label>
        <select
          id="find-ai-count"
          value={count}
          disabled={pending || Boolean(sessionToken)}
          onChange={(event) => setCount(Number(event.target.value))}
        >
          <option value={1}>1</option>
          <option value={2}>2</option>
          <option value={3}>3</option>
        </select>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button
            type="button"
            disabled={
              pending ||
              !id ||
              !productImageKey ||
              styling.trim().length < 10 ||
              Boolean(sessionToken)
            }
            onClick={() => generate()}
          >
            {pending ? 'Working…' : 'Generate'}
          </button>
          {sessionToken && (
            <>
              <button type="button" disabled={pending} onClick={() => generate(true)}>
                Regenerate with {selectedName}
              </button>
              <button type="button" disabled={pending} onClick={reset}>
                Start new session
              </button>
            </>
          )}
        </div>
        {error && <p role="alert">{error}</p>}
        {status && (
          <p role="status" aria-live="polite">
            {status}
          </p>
        )}
        {previews.map((preview, index) => (
          <fieldset key={preview.ticket} style={{ display: 'grid', gap: 8 }}>
            <legend>
              Variation {index + 1}: {preview.status}
            </legend>
            {/* Browser-memory data URL. Never written to Sanity until Approve. */}
            {preview.status !== 'rejected' && (
              <img
                src={preview.dataUrl}
                alt={`AI styling concept preview ${index + 1}`}
                style={{ width: '100%', maxWidth: 360, height: 'auto' }}
              />
            )}
            {preview.status === 'pending' && (
              <>
                <label htmlFor={`find-ai-alt-${index}`}>Image description for accessibility</label>
                <input
                  id={`find-ai-alt-${index}`}
                  value={preview.alt}
                  maxLength={240}
                  onChange={(event) =>
                    setPreviews((current) =>
                      current.map((item, position) =>
                        position === index ? { ...item, alt: event.target.value } : item,
                      ),
                    )
                  }
                />
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    type="button"
                    disabled={pending || preview.alt.trim().length < 10}
                    onClick={() => approve(index)}
                  >
                    Approve and add to Find draft
                  </button>
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() =>
                      setPreviews((current) =>
                        current.map((item, position) =>
                          position === index
                            ? { ...item, dataUrl: '', ticket: '', status: 'rejected' }
                            : item,
                        ),
                      )
                    }
                  >
                    Reject
                  </button>
                </div>
              </>
            )}
          </fieldset>
        ))}
      </section>
    </Card>
  );
}
