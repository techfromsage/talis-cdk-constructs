class Route {
  constructor(event) {
    this.event = event;
  }

  async handle() {
    console.log("Route 2 processing event.");

    return {
      statusCode: 200,
      headers: {},
      body: "route 2",
    };
  }
}

module.exports.route = async (event) => {
  const route = new Route(event);
  return await route.handle();
};
