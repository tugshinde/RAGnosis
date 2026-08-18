using RAGnosis.Api.Dtos;
using Xunit;

namespace RAGnosis.Tests;

public class PaginationTests
{
    [Fact]
    public void Defaults_apply_when_the_caller_sends_nothing()
    {
        var paging = new PageRequest();

        Assert.Equal(1, paging.Number);
        Assert.Equal(PageRequest.DefaultSize, paging.Size);
        Assert.Equal(0, paging.Skip);
    }

    [Theory]
    [InlineData(0)]
    [InlineData(-5)]
    public void Page_numbers_below_one_fall_back_to_the_first_page(int requested)
    {
        Assert.Equal(1, new PageRequest { Page = requested }.Number);
    }

    [Theory]
    [InlineData(0)]
    [InlineData(-1)]
    public void Page_sizes_below_one_fall_back_to_the_default(int requested)
    {
        Assert.Equal(PageRequest.DefaultSize, new PageRequest { PageSize = requested }.Size);
    }

    [Fact]
    public void Oversized_pages_are_clamped_rather_than_rejected()
    {
        // An unbounded page size is the thing pagination exists to prevent, so a caller
        // asking for everything is corrected instead of being handed a 400.
        Assert.Equal(PageRequest.MaxSize, new PageRequest { PageSize = 100_000 }.Size);
    }

    [Fact]
    public void Skip_counts_whole_pages_before_the_requested_one()
    {
        Assert.Equal(40, new PageRequest { Page = 3, PageSize = 20 }.Skip);
    }

    [Fact]
    public void Page_size_survives_alongside_an_explicit_page_number()
    {
        // Regression: naming an action parameter after one of this type's own query keys made
        // the complex-type binder prefix-match "page", fail, and hand back an all-defaults
        // instance — so "?page=1&page_size=1" quietly returned 50 rows. The endpoints bind
        // this with [FromQuery(Name = "")] to keep the two values independent.
        var paging = new PageRequest { Page = 1, PageSize = 1 };

        Assert.Equal(1, paging.Number);
        Assert.Equal(1, paging.Size);
    }

    [Fact]
    public void Metadata_reports_the_total_and_whether_more_remains()
    {
        var info = PageInfo.From(new PageRequest { Page = 1, PageSize = 10 }, totalItems: 25);

        Assert.Equal(1, info.Page);
        Assert.Equal(10, info.PageSize);
        Assert.Equal(25, info.TotalItems);
        Assert.Equal(3, info.TotalPages);
        Assert.True(info.HasNext);
    }

    [Fact]
    public void The_last_page_reports_no_successor()
    {
        var info = PageInfo.From(new PageRequest { Page = 3, PageSize = 10 }, totalItems: 25);

        Assert.Equal(3, info.TotalPages);
        Assert.False(info.HasNext);
    }

    [Fact]
    public void An_empty_collection_has_no_pages_and_no_successor()
    {
        var info = PageInfo.From(new PageRequest(), totalItems: 0);

        Assert.Equal(0, info.TotalPages);
        Assert.False(info.HasNext);
    }
}
