using System.Globalization;
using System.Text;

namespace RAGnosis.Api.Services;

/// <summary>
/// BERT-style WordPiece tokenizer matching the preprocessing used by the
/// sentence-transformers MiniLM family. Needed because ONNX Runtime consumes
/// token ids, not raw text.
/// </summary>
public sealed class WordPieceTokenizer
{
    private const string UnknownToken = "[UNK]";
    private const string ClsToken = "[CLS]";
    private const string SepToken = "[SEP]";
    private const string PadToken = "[PAD]";
    private const int MaxCharsPerWord = 100;

    private readonly Dictionary<string, int> _vocab;
    private readonly bool _lowerCase;

    public int ClsId { get; }
    public int SepId { get; }
    public int PadId { get; }
    public int UnkId { get; }

    public WordPieceTokenizer(IEnumerable<string> vocabLines, bool lowerCase = true)
    {
        _lowerCase = lowerCase;
        _vocab = new Dictionary<string, int>(StringComparer.Ordinal);

        var index = 0;
        foreach (var line in vocabLines)
        {
            var token = line.TrimEnd('\n', '\r');
            _vocab.TryAdd(token, index);
            index++;
        }

        if (_vocab.Count == 0)
            throw new InvalidOperationException("The tokenizer vocabulary is empty.");

        ClsId = Lookup(ClsToken);
        SepId = Lookup(SepToken);
        PadId = Lookup(PadToken);
        UnkId = Lookup(UnknownToken);
    }

    public static WordPieceTokenizer FromFile(string vocabPath, bool lowerCase = true) =>
        new(File.ReadLines(vocabPath), lowerCase);

    private int Lookup(string token) =>
        _vocab.TryGetValue(token, out var id)
            ? id
            : throw new InvalidOperationException($"Vocabulary is missing the required '{token}' token.");

    /// <summary>Encodes text to padded id/mask arrays of exactly <paramref name="maxLength"/> elements.</summary>
    public (long[] InputIds, long[] AttentionMask, long[] TokenTypeIds) Encode(string text, int maxLength)
    {
        var ids = new List<long>(maxLength) { ClsId };

        // Two slots reserved for [CLS] and [SEP].
        foreach (var word in BasicTokenize(text))
        {
            if (ids.Count >= maxLength - 1) break;

            foreach (var piece in WordPiece(word))
            {
                if (ids.Count >= maxLength - 1) break;
                ids.Add(piece);
            }
        }

        ids.Add(SepId);

        var inputIds = new long[maxLength];
        var attentionMask = new long[maxLength];
        var tokenTypeIds = new long[maxLength];

        for (var i = 0; i < maxLength; i++)
        {
            if (i < ids.Count)
            {
                inputIds[i] = ids[i];
                attentionMask[i] = 1;
            }
            else
            {
                inputIds[i] = PadId;
                attentionMask[i] = 0;
            }
            tokenTypeIds[i] = 0;
        }

        return (inputIds, attentionMask, tokenTypeIds);
    }

    /// <summary>Lower-cases, strips accents, and splits on whitespace and punctuation.</summary>
    private IEnumerable<string> BasicTokenize(string text)
    {
        if (string.IsNullOrWhiteSpace(text)) yield break;

        var normalized = _lowerCase ? StripAccents(text.ToLowerInvariant()) : text;
        var buffer = new StringBuilder();

        foreach (var ch in normalized)
        {
            if (char.IsWhiteSpace(ch) || char.IsControl(ch))
            {
                if (buffer.Length > 0) { yield return buffer.ToString(); buffer.Clear(); }
            }
            else if (char.IsPunctuation(ch) || char.IsSymbol(ch))
            {
                if (buffer.Length > 0) { yield return buffer.ToString(); buffer.Clear(); }
                yield return ch.ToString();
            }
            else
            {
                buffer.Append(ch);
            }
        }

        if (buffer.Length > 0) yield return buffer.ToString();
    }

    private static string StripAccents(string text)
    {
        var decomposed = text.Normalize(NormalizationForm.FormD);
        var builder = new StringBuilder(decomposed.Length);

        foreach (var ch in decomposed)
        {
            if (CharUnicodeInfo.GetUnicodeCategory(ch) != UnicodeCategory.NonSpacingMark)
                builder.Append(ch);
        }

        return builder.ToString().Normalize(NormalizationForm.FormC);
    }

    /// <summary>Greedy longest-match-first subword segmentation.</summary>
    private IEnumerable<long> WordPiece(string word)
    {
        if (word.Length > MaxCharsPerWord)
        {
            yield return UnkId;
            yield break;
        }

        var pieces = new List<long>();
        var start = 0;

        while (start < word.Length)
        {
            var end = word.Length;
            var matched = -1;

            while (start < end)
            {
                var candidate = start == 0 ? word[start..end] : "##" + word[start..end];
                if (_vocab.TryGetValue(candidate, out var id))
                {
                    matched = id;
                    break;
                }
                end--;
            }

            // An unmatched fragment invalidates the whole word.
            if (matched < 0)
            {
                yield return UnkId;
                yield break;
            }

            pieces.Add(matched);
            start = end;
        }

        foreach (var piece in pieces) yield return piece;
    }
}
