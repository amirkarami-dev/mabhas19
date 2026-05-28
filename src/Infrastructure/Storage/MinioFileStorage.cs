using Mabhas19.Application.Common.Interfaces;
using Minio;
using Minio.DataModel.Args;
using Microsoft.Extensions.Options;

namespace Mabhas19.Infrastructure.Storage;

public class MinioFileStorage : IFileStorage
{
    private readonly IMinioClient _client;
    private readonly MinioOptions _options;
    private bool _bucketChecked;

    public MinioFileStorage(IMinioClient client, IOptions<MinioOptions> options)
    {
        _client = client;
        _options = options.Value;
    }

    private async Task EnsureBucketAsync(CancellationToken ct)
    {
        if (_bucketChecked) return;

        var exists = await _client.BucketExistsAsync(
            new BucketExistsArgs().WithBucket(_options.Bucket), ct);

        if (!exists)
        {
            await _client.MakeBucketAsync(new MakeBucketArgs().WithBucket(_options.Bucket), ct);
        }

        _bucketChecked = true;
    }

    public async Task PutAsync(string key, Stream content, string contentType, CancellationToken ct = default)
    {
        await EnsureBucketAsync(ct);

        await _client.PutObjectAsync(new PutObjectArgs()
            .WithBucket(_options.Bucket)
            .WithObject(key)
            .WithStreamData(content)
            .WithObjectSize(content.Length)
            .WithContentType(contentType), ct);
    }

    public async Task<Stream> GetAsync(string key, CancellationToken ct = default)
    {
        var ms = new MemoryStream();

        await _client.GetObjectAsync(new GetObjectArgs()
            .WithBucket(_options.Bucket)
            .WithObject(key)
            .WithCallbackStream(s => s.CopyTo(ms)), ct);

        ms.Position = 0;
        return ms;
    }

    public async Task DeleteAsync(string key, CancellationToken ct = default)
    {
        await _client.RemoveObjectAsync(new RemoveObjectArgs()
            .WithBucket(_options.Bucket)
            .WithObject(key), ct);
    }

    public async Task<string> GetPresignedUrlAsync(string key, TimeSpan expiry, CancellationToken ct = default)
    {
        var url = await _client.PresignedGetObjectAsync(new PresignedGetObjectArgs()
            .WithBucket(_options.Bucket)
            .WithObject(key)
            .WithExpiry((int)expiry.TotalSeconds));

        // Rewrite host when a public endpoint differs from the internal one (e.g. behind a proxy).
        if (!string.IsNullOrWhiteSpace(_options.PublicEndpoint))
        {
            var builder = new UriBuilder(url);
            var pub = new Uri(_options.PublicEndpoint!.Contains("://") ? _options.PublicEndpoint! : $"https://{_options.PublicEndpoint}");
            builder.Scheme = pub.Scheme;
            builder.Host = pub.Host;
            builder.Port = pub.IsDefaultPort ? -1 : pub.Port;
            url = builder.Uri.ToString();
        }

        return url;
    }
}
