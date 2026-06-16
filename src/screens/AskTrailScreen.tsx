/**
 * AskTrailScreen — the app's central "ask a question → get a trail" surface.
 *
 * Two entry modes:
 *  1. As the middle tab (no params): the user first picks a repo (search +
 *     suggestions), then asks a question about it.
 *  2. From a repo's File City screen (params with owner/repo): the repo is
 *     locked and we jump straight to the question step.
 *
 * The user types a natural-language question; we POST a run to web-ade
 * (`/api/authoring/runs`) and poll for completion via {@link useAuthoringRun}.
 * On success we navigate to the rendered trail (`TrailDetailScreen`) — the same
 * screen the inbox opens, since the run also self-delivers the trail to the
 * user's inbox. Leaving mid-run is safe: the run continues server-side and
 * lands in the inbox. See `mobile-app/docs/AUTHORING_API.md`.
 */

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  useNavigation,
  useRoute,
  type RouteProp,
} from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import { useTheme } from '@principal-ade/industry-theme';
import { LucideIcon } from '../components/LucideIcon';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { useAuthContext } from '../context/AuthContext';
import { useAuthoringRun } from '../hooks/useAuthoringRun';
import {
  searchRepos,
  getSuggestedRepos,
  type GitHubRepo,
  type SuggestedRepo,
} from '../services/GitHubSearchService';
import { getAuthoringRepos } from '../services/AuthoringApiService';
import type { CuratedRepo, AuthoringReposResponse } from '../types/Authoring';
import type { AskStackParamList } from '../navigation/types';

/** Warm accent for "may not import" flags — softer than a hard error. */
const WARN_COLOR = '#FF9500';

/** Fallback when the authoring repos fetch fails — keep the warn-but-allow copy. */
const FALLBACK_NOTICE =
  "Some repositories currently can't be imported for authoring, and we're " +
  'investigating. You can still try, but it may fail.';

// The screen is reused under two route names (`AskHome` in the Ask tab,
// `AskTrail` when pushed from a repo screen). Both carry the same optional
// params, so typing against the Ask stack covers both at runtime.
type AskNavigationProp = StackNavigationProp<AskStackParamList, 'AskHome'>;
type AskRouteProp = RouteProp<AskStackParamList, 'AskHome'>;

/** The repo the question is about, once chosen. */
interface SelectedRepo {
  owner: string;
  repo: string;
  fullName: string;
  ref?: string;
}

const EXAMPLE_QUESTIONS = [
  'How does authentication work?',
  'Walk me through the request lifecycle.',
  'Where is the data persisted?',
  'How are errors handled?',
];

export function AskTrailScreen() {
  const route = useRoute<AskRouteProp>();
  const params = route.params;

  // A repo passed in params (from a File City screen) locks the screen to that
  // repo; otherwise we start on the repo picker.
  const lockedRepo: SelectedRepo | null =
    params?.owner && params?.repo
      ? {
          owner: params.owner,
          repo: params.repo,
          fullName: params.fullName ?? `${params.owner}/${params.repo}`,
          ref: params.ref,
        }
      : null;

  const [selectedRepo, setSelectedRepo] = useState<SelectedRepo | null>(lockedRepo);

  if (!selectedRepo) {
    return <RepoPickerStep onSelect={setSelectedRepo} />;
  }

  return (
    <AskQuestionStep
      repo={selectedRepo}
      // Only offer "change repo" when the user picked it here (not locked from
      // a repo screen).
      onChangeRepo={lockedRepo ? undefined : () => setSelectedRepo(null)}
    />
  );
}

export default AskTrailScreen;

// ============================================================================
// Step 1 — pick a repo (tab entry only)
// ============================================================================

function RepoPickerStep({ onSelect }: { onSelect: (repo: SelectedRepo) => void }) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { token } = useAuthContext();

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<GitHubRepo[]>([]);
  const [suggestions, setSuggestions] = useState<SuggestedRepo[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [loadingSuggestions, setLoadingSuggestions] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Curated + unsupported lists from web-ade. Refetched whenever this picker
  // mounts (e.g. after a failed run sends the user back here), so a newly-failed
  // repo shows its flag the next time around.
  const [authoring, setAuthoring] = useState<AuthoringReposResponse | null>(null);

  // Load suggested repos (starred + org) on mount.
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const { repos } = await getSuggestedRepos(token);
        if (active) setSuggestions(repos);
      } catch {
        // Non-fatal — the search field still works.
      } finally {
        if (active) setLoadingSuggestions(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [token]);

  // Load the authoring repo lists (curated + unsupported + notice).
  useEffect(() => {
    if (!token) return;
    let active = true;
    (async () => {
      try {
        const data = await getAuthoringRepos(token);
        if (active) setAuthoring(data);
      } catch {
        // Non-fatal — picker still works; we just won't flag unsupported repos.
      }
    })();
    return () => {
      active = false;
    };
  }, [token]);

  // Debounced repo search.
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    const id = setTimeout(async () => {
      setIsSearching(true);
      setError(null);
      try {
        const { repos } = await searchRepos(query, { perPage: 20 });
        setResults(repos);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Search failed');
        setResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300);
    return () => clearTimeout(id);
  }, [query]);

  const unsupportedSet = useMemo(
    () =>
      new Set(
        (authoring?.unsupported ?? []).map((r) =>
          `${r.owner}/${r.repo}`.toLowerCase(),
        ),
      ),
    [authoring],
  );
  const isUnsupported = useCallback(
    (owner: string, repo: string) =>
      unsupportedSet.has(`${owner}/${repo}`.toLowerCase()),
    [unsupportedSet],
  );

  const notice = authoring?.notice ?? FALLBACK_NOTICE;

  // Warn-but-allow: picking a known-unsupported repo confirms first, then lets
  // the user proceed anyway. Verified/curated picks go straight through.
  const handlePick = useCallback(
    (sel: SelectedRepo) => {
      if (isUnsupported(sel.owner, sel.repo)) {
        Alert.alert(`${sel.fullName} may not import`, notice, [
          { text: 'Pick another', style: 'cancel' },
          { text: 'Try anyway', onPress: () => onSelect(sel) },
        ]);
        return;
      }
      onSelect(sel);
    },
    [isUnsupported, notice, onSelect],
  );

  const pickGitHub = useCallback(
    (r: GitHubRepo) =>
      handlePick({ owner: r.owner, repo: r.name, fullName: r.full_name }),
    [handlePick],
  );
  const pickCurated = useCallback(
    (c: CuratedRepo) =>
      handlePick({
        owner: c.owner,
        repo: c.repo,
        fullName: `${c.owner}/${c.repo}`,
        ref: c.ref,
      }),
    [handlePick],
  );

  const showingResults = query.trim().length > 0;

  // While searching, float the user's own repos (starred + org) that match the
  // query to the top, then append the global GitHub results — deduped by
  // full_name. searchRepos is unauthenticated and can't see private/org repos,
  // so matching `suggestions` locally is the only way those surface once the
  // user starts typing. Local matches render instantly (no network), so typing
  // narrows your repos rather than replacing them wholesale.
  const data = useMemo<GitHubRepo[]>(() => {
    if (!showingResults) return suggestions;
    const q = query.trim().toLowerCase();
    const matchingSuggestions = suggestions.filter(
      (r) =>
        r.full_name.toLowerCase().includes(q) ||
        r.name.toLowerCase().includes(q) ||
        r.owner.toLowerCase().includes(q),
    );
    const seen = new Set(
      matchingSuggestions.map((r) => r.full_name.toLowerCase()),
    );
    const rest = results.filter((r) => !seen.has(r.full_name.toLowerCase()));
    return [...matchingSuggestions, ...rest];
  }, [showingResults, query, suggestions, results]);

  const curated = authoring?.curated ?? [];

  const renderRepo = ({ item }: { item: GitHubRepo }) => {
    const flagged = isUnsupported(item.owner, item.name);
    return (
      <TouchableOpacity
        style={[styles.repoRow, { borderBottomColor: theme.colors.border }]}
        onPress={() => pickGitHub(item)}
        activeOpacity={0.7}
      >
        <Image source={{ uri: item.owner_avatar_url }} style={styles.repoAvatar} />
        <View style={styles.repoInfo}>
          <Text style={[styles.repoName, { color: theme.colors.text }]} numberOfLines={1}>
            {item.full_name}
          </Text>
          {flagged ? (
            <Text style={[styles.warnText, { color: WARN_COLOR }]} numberOfLines={1}>
              Import currently failing — we're investigating
            </Text>
          ) : item.description ? (
            <Text
              style={[styles.repoDesc, { color: theme.colors.textSecondary }]}
              numberOfLines={1}
            >
              {item.description}
            </Text>
          ) : null}
        </View>
        <LucideIcon
          name={flagged ? 'Info' : 'Sparkles'}
          size={16}
          color={flagged ? WARN_COLOR : theme.colors.primary}
        />
      </TouchableOpacity>
    );
  };

  // Curated section + the "Your repositories" heading ride above the suggestion
  // list (not shown while searching). Curated repos are verified to import, so
  // they never carry the unsupported flag.
  const listHeader =
    !showingResults && (curated.length > 0 || suggestions.length > 0) ? (
      <View>
        {curated.length > 0 ? (
          <>
            <Text style={[styles.listHeading, { color: theme.colors.textSecondary }]}>
              Verified for authoring
            </Text>
            {curated.map((c) => (
              <TouchableOpacity
                key={`${c.owner}/${c.repo}`}
                style={[styles.repoRow, { borderBottomColor: theme.colors.border }]}
                onPress={() => pickCurated(c)}
                activeOpacity={0.7}
              >
                <View
                  style={[
                    styles.curatedBadge,
                    { backgroundColor: 'rgba(52,199,89,0.15)' },
                  ]}
                >
                  <LucideIcon name="Check" size={18} color="#34C759" />
                </View>
                <View style={styles.repoInfo}>
                  <Text
                    style={[styles.repoName, { color: theme.colors.text }]}
                    numberOfLines={1}
                  >
                    {c.owner}/{c.repo}
                  </Text>
                  {c.description ? (
                    <Text
                      style={[styles.repoDesc, { color: theme.colors.textSecondary }]}
                      numberOfLines={1}
                    >
                      {c.description}
                    </Text>
                  ) : null}
                </View>
                <LucideIcon name="Sparkles" size={16} color={theme.colors.primary} />
              </TouchableOpacity>
            ))}
          </>
        ) : null}
        {suggestions.length > 0 ? (
          <Text style={[styles.listHeading, { color: theme.colors.textSecondary }]}>
            Your repositories
          </Text>
        ) : null}
      </View>
    ) : null;

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 8, borderBottomColor: theme.colors.border }]}>
        <View style={styles.headerSide} />
        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Ask a question</Text>
          <Text style={[styles.headerSubtitle, { color: theme.colors.textSecondary }]}>
            Pick a repository
          </Text>
        </View>
        <View style={styles.headerSide} />
      </View>

      <View style={styles.searchWrap}>
        <TextInput
          style={[
            styles.searchInput,
            {
              backgroundColor: theme.colors.surface,
              color: theme.colors.text,
              borderColor: theme.colors.border,
            },
          ]}
          placeholder="Search repositories…"
          placeholderTextColor={theme.colors.textSecondary}
          value={query}
          onChangeText={setQuery}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
        />
      </View>

      {(loadingSuggestions && !showingResults) ||
      (isSearching && data.length === 0) ? (
        <View style={styles.centerFill}>
          <LoadingSpinner size="large" color={theme.colors.primary} />
        </View>
      ) : error ? (
        <View style={styles.centerFill}>
          <Text style={[styles.muted, { color: theme.colors.error }]}>{error}</Text>
        </View>
      ) : (
        <FlatList
          data={data}
          keyExtractor={(item) => item.full_name ?? `${item.owner}/${item.name}`}
          renderItem={renderRepo}
          ListHeaderComponent={listHeader}
          ListEmptyComponent={
            // When not searching, the curated list lives in the header, so only
            // show an empty hint when there's genuinely nothing to offer.
            showingResults || (curated.length === 0 && suggestions.length === 0) ? (
              <View style={styles.emptyHint}>
                <Text style={[styles.muted, { color: theme.colors.textSecondary }]}>
                  {showingResults
                    ? `No repositories found for "${query}"`
                    : 'Search for a repository to ask about'}
                </Text>
              </View>
            ) : null
          }
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: insets.bottom + 16 }}
        />
      )}
    </View>
  );
}

// ============================================================================
// Step 2 — ask the question
// ============================================================================

function AskQuestionStep({
  repo,
  onChangeRepo,
}: {
  repo: SelectedRepo;
  onChangeRepo?: () => void;
}) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<AskNavigationProp>();
  const { token } = useAuthContext();

  const { owner, repo: repoName, ref, fullName } = repo;
  const repoLabel = fullName || `${owner}/${repoName}`;

  const [question, setQuestion] = useState('');
  const { phase, run, error, isBusy, start, reset } = useAuthoringRun(token);

  const trimmed = question.trim();
  const canSubmit = trimmed.length > 0 && !isBusy;

  const handleSubmit = useCallback(() => {
    if (!trimmed || isBusy) return;
    start({ owner, repo: repoName, ref, question: trimmed });
  }, [trimmed, isBusy, start, owner, repoName, ref]);

  const handleViewTrail = useCallback(() => {
    if (run?.trailId) {
      navigation.navigate('TrailDetail', { trailId: run.trailId });
    }
  }, [navigation, run?.trailId]);

  const handleAskAnother = useCallback(() => {
    setQuestion('');
    reset();
  }, [reset]);

  const showForm = phase === 'idle' || phase === 'failed';

  // Left header action: change repo (tab entry) → go back to picker. No "close"
  // — the Ask screen is a root tab, so there's nothing to close.
  const leftAction = onChangeRepo ? { label: 'Repos', onPress: onChangeRepo } : null;

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={[styles.header, { paddingTop: insets.top + 8, borderBottomColor: theme.colors.border }]}>
        {leftAction ? (
          <TouchableOpacity onPress={leftAction.onPress} style={styles.headerSide}>
            <Text style={[styles.cancelText, { color: theme.colors.textSecondary }]}>
              {leftAction.label}
            </Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.headerSide} />
        )}
        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Ask a question</Text>
          <Text
            style={[styles.headerSubtitle, { color: theme.colors.textSecondary }]}
            numberOfLines={1}
          >
            {repoLabel}
          </Text>
        </View>
        <View style={styles.headerSide} />
      </View>

      <ScrollView
        style={styles.body}
        contentContainerStyle={[styles.bodyContent, { paddingBottom: insets.bottom + 24 }]}
        keyboardShouldPersistTaps="handled"
      >
        {showForm ? (
          <>
            <Text style={[styles.prompt, { color: theme.colors.text }]}>
              What do you want to understand about{' '}
              <Text style={{ fontWeight: '700' }}>{repoLabel}</Text>?
            </Text>
            <Text style={[styles.helper, { color: theme.colors.textSecondary }]}>
              We'll explore the repo and author a trail that answers it — it lands
              here and in your inbox.
            </Text>

            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: theme.colors.surface,
                  color: theme.colors.text,
                  borderColor: theme.colors.border,
                },
              ]}
              placeholder="e.g. How does the login flow work?"
              placeholderTextColor={theme.colors.textSecondary}
              value={question}
              onChangeText={setQuestion}
              multiline
              autoFocus
              textAlignVertical="top"
              returnKeyType="default"
            />

            <View style={styles.chips}>
              {EXAMPLE_QUESTIONS.map((q) => (
                <TouchableOpacity
                  key={q}
                  style={[
                    styles.chip,
                    { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
                  ]}
                  onPress={() => setQuestion(q)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.chipText, { color: theme.colors.textSecondary }]}>{q}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {phase === 'failed' && error ? (
              <View style={[styles.errorBanner, { backgroundColor: 'rgba(255,59,48,0.12)' }]}>
                <LucideIcon name="Info" size={16} color={theme.colors.error} />
                <Text style={[styles.errorText, { color: theme.colors.error }]}>{error}</Text>
              </View>
            ) : null}

            <TouchableOpacity
              style={[
                styles.submitButton,
                { backgroundColor: canSubmit ? theme.colors.primary : theme.colors.border },
              ]}
              onPress={handleSubmit}
              disabled={!canSubmit}
              activeOpacity={0.8}
            >
              <LucideIcon name="Sparkles" size={18} color={canSubmit ? '#fff' : theme.colors.textSecondary} />
              <Text
                style={[styles.submitText, { color: canSubmit ? '#fff' : theme.colors.textSecondary }]}
              >
                Author a trail
              </Text>
            </TouchableOpacity>
          </>
        ) : phase === 'succeeded' ? (
          <View style={styles.statusBlock}>
            <View style={[styles.statusIconWrap, { backgroundColor: 'rgba(52,199,89,0.15)' }]}>
              <LucideIcon name="Check" size={32} color="#34C759" />
            </View>
            <Text style={[styles.statusTitle, { color: theme.colors.text }]}>Your trail is ready</Text>
            <Text style={[styles.statusBody, { color: theme.colors.textSecondary }]}>
              We authored a trail for "{trimmed}". It's also waiting in your inbox.
            </Text>
            <TouchableOpacity
              style={[styles.submitButton, { backgroundColor: theme.colors.primary }]}
              onPress={handleViewTrail}
              disabled={!run?.trailId}
              activeOpacity={0.8}
            >
              <Text style={[styles.submitText, { color: '#fff' }]}>View trail</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleAskAnother} style={styles.secondaryButton}>
              <Text style={[styles.secondaryText, { color: theme.colors.primary }]}>
                Ask another question
              </Text>
            </TouchableOpacity>
          </View>
        ) : phase === 'timeout' ? (
          <View style={styles.statusBlock}>
            <View style={[styles.statusIconWrap, { backgroundColor: 'rgba(255,149,0,0.15)' }]}>
              <LucideIcon name="Clock" size={32} color="#FF9500" />
            </View>
            <Text style={[styles.statusTitle, { color: theme.colors.text }]}>Still working on it</Text>
            <Text style={[styles.statusBody, { color: theme.colors.textSecondary }]}>
              This is taking longer than usual. You can close this — we'll drop the
              finished trail in your inbox when it's ready.
            </Text>
            <TouchableOpacity onPress={handleAskAnother} style={styles.secondaryButton}>
              <Text style={[styles.secondaryText, { color: theme.colors.primary }]}>
                Ask another question
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          // creating / running
          <View style={styles.statusBlock}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={[styles.statusTitle, { color: theme.colors.text, marginTop: 20 }]}>
              {phase === 'creating' ? 'Starting…' : 'Authoring a trail…'}
            </Text>
            <Text style={[styles.statusBody, { color: theme.colors.textSecondary }]}>
              Exploring {repoLabel} to answer:
            </Text>
            <Text style={[styles.runningQuestion, { color: theme.colors.text }]}>"{trimmed}"</Text>
            <Text style={[styles.statusHint, { color: theme.colors.textSecondary }]}>
              This takes up to a couple of minutes. You can leave — it'll arrive in
              your inbox either way.
            </Text>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  headerSide: {
    width: 56,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
  },
  headerSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  cancelText: {
    fontSize: 17,
  },
  // Repo picker
  searchWrap: {
    padding: 16,
  },
  searchInput: {
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 16,
    fontSize: 16,
  },
  listHeading: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  centerFill: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  muted: {
    fontSize: 15,
    textAlign: 'center',
  },
  repoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  repoAvatar: {
    width: 36,
    height: 36,
    borderRadius: 8,
    marginRight: 12,
  },
  repoInfo: {
    flex: 1,
    marginRight: 12,
  },
  repoName: {
    fontSize: 15,
    fontWeight: '600',
  },
  repoDesc: {
    fontSize: 13,
    marginTop: 2,
  },
  warnText: {
    fontSize: 13,
    marginTop: 2,
    fontWeight: '500',
  },
  curatedBadge: {
    width: 36,
    height: 36,
    borderRadius: 8,
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyHint: {
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 48,
  },
  // Ask step
  body: {
    flex: 1,
  },
  bodyContent: {
    padding: 20,
  },
  prompt: {
    fontSize: 22,
    fontWeight: '700',
    lineHeight: 30,
  },
  helper: {
    fontSize: 14,
    marginTop: 8,
    lineHeight: 20,
  },
  input: {
    minHeight: 120,
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    fontSize: 16,
    marginTop: 20,
    lineHeight: 22,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 16,
    gap: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 13,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 10,
    marginTop: 20,
  },
  errorText: {
    fontSize: 14,
    flex: 1,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 52,
    borderRadius: 12,
    marginTop: 24,
  },
  submitText: {
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    marginTop: 16,
    paddingVertical: 12,
  },
  secondaryText: {
    fontSize: 15,
    fontWeight: '500',
  },
  statusBlock: {
    alignItems: 'center',
    paddingTop: 48,
    paddingHorizontal: 8,
  },
  statusIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  statusTitle: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
  },
  statusBody: {
    fontSize: 15,
    textAlign: 'center',
    marginTop: 10,
    lineHeight: 21,
  },
  runningQuestion: {
    fontSize: 16,
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 22,
  },
  statusHint: {
    fontSize: 13,
    textAlign: 'center',
    marginTop: 20,
    lineHeight: 19,
  },
});
